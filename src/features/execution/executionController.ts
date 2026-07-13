import { byId, createElement } from "../../core/dom";
import { formatDate, getWeekKey, toIsoDate } from "../../core/dates";
import { makeId } from "../../core/ids";
import { getSettings } from "../../core/settings";
import { dailyKey, getJson, setJson, storageKeys, weeklyKey } from "../../core/storage";
import type { CalendarMarks, DailyTask, KanbanBoard, KanbanColumn, KanbanItem, LedgerItem, Priority, Subtask, WeeklyFocus } from "../../models/execution";
import type { Strategy } from "../../models/strategy";

const kanbanColumns: KanbanColumn[] = ["Ideas", "This Week", "Complete", "Parking Lot"];
const defaultFocus: WeeklyFocus = {
  main: "Write project brief",
  secondary: "Review prototype",
  health: "Move for 20 minutes"
};

interface SelectedWork {
  column: KanbanColumn;
  index: number;
}

interface ProjectLookup extends SelectedWork {
  item: KanbanItem;
}

interface StoredTask {
  text?: string;
  done?: boolean;
  projectId?: string | null;
  subtaskId?: string | null;
}

const today = new Date();
const isoDate = toIsoDate(today);

let dailyTasks: DailyTask[] = normalizeDailyTasks(getJson<StoredTask[] | string[]>(dailyKey(isoDate), []));
let weeklyFocus: WeeklyFocus = normalizeFocus(getJson<Partial<WeeklyFocus>>(weeklyKey(getWeekKey(today)), defaultFocus));
let calendar: CalendarMarks = getJson<CalendarMarks>(storageKeys.calendar, {});
let kanban: KanbanBoard = normalizeKanban(getJson<Partial<KanbanBoard>>(storageKeys.kanban, defaultKanban()), getJson<KanbanItem[] | null>(storageKeys.parkingLot, null));
let doneLedger: LedgerItem[] = normalizeLedger(getJson<LedgerItem[]>(storageKeys.doneLedger, []));
let selectedWork: SelectedWork | null = null;
let dragSource: SelectedWork | null = null;
let visibleCalendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let lastMarkedDateKey = "";
let celebrationTimer: number | undefined;

export function initialiseExecutionPage(): void {
  byId("today-label").textContent = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  bindEvents();
  setJson(dailyKey(isoDate), dailyTasks);
  saveKanban();
  renderNorthStar();
  renderDailyTasks();
  renderFocus();
  renderCalendar();
  renderKanban();
  renderLedger();

  window.addEventListener("storage", (event) => {
    if (event.key === storageKeys.strategy) renderNorthStar();
  });
  window.addEventListener("focus", renderNorthStar);
  window.addEventListener("lifeCompass:settingsChanged", () => {
    renderDailyTasks();
    renderFocus();
    renderKanban();
    applyWorkEditorMode();
    renderSubtasks();
  });
}

function isEditMode(): boolean {
  return getSettings().editMode;
}

function defaultKanban(): KanbanBoard {
  return {
    Ideas: [
      projectItem("Review prototype", "Walk through the current template and note the next useful improvement.", "medium", [
        "Open the app locally",
        "List three improvements",
        "Choose one next step"
      ]),
      projectItem("Create public checklist", "Prepare the repository for safe sharing.", "medium", [
        "Review README",
        "Check demo data only"
      ])
    ],
    "This Week": [
      projectItem("Write project brief", "Describe the goal, scope and next milestone.", "high", [
        "Outline argument",
        "Draft first version",
        "Review and simplify"
      ])
    ],
    Complete: [],
    "Parking Lot": []
  };
}

function projectItem(title: string, description: string, priority: Priority, subtasks: Array<string | Partial<Subtask>>): KanbanItem {
  return {
    id: makeId(),
    title,
    date: isoDate,
    description: description || "",
    priority: priority || "medium",
    subtasks: (subtasks || []).slice(0, 6).map(normalizeSubtask)
  };
}

function normalizeDailyTasks(tasks: StoredTask[] | string[]): DailyTask[] {
  const normalized: Array<StoredTask | string> = Array.isArray(tasks) ? tasks.slice(0, 3) : [];
  while (normalized.length < 3) normalized.push({ text: "", done: false });
  return normalized.map((task) => ({
    text: typeof task === "string" ? task : task.text || "",
    done: typeof task === "string" ? false : Boolean(task.done),
    projectId: typeof task === "string" ? null : task.projectId || null,
    subtaskId: typeof task === "string" ? null : task.subtaskId || null
  }));
}

function normalizeFocus(value: Partial<WeeklyFocus> & { finish?: string }): WeeklyFocus {
  return {
    main: value.main || defaultFocus.main,
    secondary: value.secondary || defaultFocus.secondary,
    health: value.health || value.finish || defaultFocus.health
  };
}

function normalizeKanban(value: Partial<KanbanBoard> & Record<string, unknown>, parkingLot: KanbanItem[] | null): KanbanBoard {
  const source: Record<KanbanColumn, unknown[]> = {
    Ideas: [...arrayValue(value.Ideas), ...arrayValue(value.Backlog)],
    "This Week": arrayValue(value["This Week"]),
    Complete: [...arrayValue(value.Complete), ...arrayValue(value.Done)],
    "Parking Lot": Array.isArray(parkingLot) ? parkingLot : [...arrayValue(value["Parking Lot"]), ...arrayValue(value.Parking)]
  };
  const normalized = {} as KanbanBoard;

  kanbanColumns.forEach((column) => {
    normalized[column] = source[column].map((item) => {
      if (typeof item === "string") return projectItem(item, "", "medium", []);
      const candidate = item as Partial<KanbanItem>;
      return {
        id: candidate.id || makeId(),
        title: candidate.title || "Untitled project",
        date: candidate.date || isoDate,
        description: candidate.description || "",
        priority: isPriority(candidate.priority) ? candidate.priority : "medium",
        subtasks: Array.isArray(candidate.subtasks) ? candidate.subtasks.slice(0, 6).map(normalizeSubtask) : []
      };
    });
  });

  return normalized;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isPriority(value: unknown): value is Priority {
  return value === "low" || value === "medium" || value === "high";
}

function normalizeSubtask(subtask: string | Partial<Subtask>): Subtask {
  if (typeof subtask === "string") {
    return { id: makeId(), text: subtask, done: false };
  }
  return {
    id: subtask.id || makeId(),
    text: subtask.text || "",
    done: Boolean(subtask.done)
  };
}

function normalizeLedger(items: Array<Partial<LedgerItem> | string>): LedgerItem[] {
  return Array.isArray(items) ? items.map((item) => {
    if (typeof item === "string") {
      return { text: item, source: "Completed task", date: new Date().toISOString() };
    }
    return {
      text: item.text || "Completed task",
      source: item.source || "Completed task",
      date: item.date || new Date().toISOString()
    };
  }) : [];
}

function saveDaily(): void {
  setJson(dailyKey(isoDate), dailyTasks);
}

function saveFocus(): void {
  setJson(weeklyKey(getWeekKey(today)), weeklyFocus);
  const summary = [weeklyFocus.main, weeklyFocus.secondary, weeklyFocus.health].filter(Boolean).join(" + ");
  byId("weekly-focus-summary").textContent = summary || "Set this week's focus";
}

function renderNorthStar(): void {
  const strategy = getJson<Partial<Strategy>>(storageKeys.strategy, {});
  byId("execution-north-star").textContent = strategy.northStar || "Build a meaningful career";
}

function saveKanban(): void {
  setJson(storageKeys.kanban, kanban);
  setJson(storageKeys.parkingLot, kanban["Parking Lot"]);
}

function addLedger(text: string, source: LedgerItem["source"]): void {
  const cleanText = text.trim();
  if (!cleanText) return;

  // A completion can be re-triggered for the same item on the same day
  // (e.g. a project re-completing a subtask check); skip the duplicate
  // rather than logging it twice.
  const today = toIsoDate(new Date());
  const alreadyLogged = doneLedger.some(
    (entry) => entry.text === cleanText && entry.source === source && toIsoDate(new Date(entry.date)) === today
  );
  if (alreadyLogged) return;

  doneLedger = [
    { text: cleanText, source, date: new Date().toISOString() },
    ...doneLedger
  ];
  setJson(storageKeys.doneLedger, doneLedger);
  renderLedger();
}

function addTaskToDaily(text: string, projectId: string, subtaskId: string): boolean {
  const cleanText = text.trim();
  if (!cleanText) return false;
  const emptyIndex = dailyTasks.findIndex((task) => !task.text.trim());
  if (emptyIndex === -1) {
    showStatusToast("Today's three are full. Clear a slot before adding this subtask.");
    return false;
  }
  dailyTasks[emptyIndex].text = cleanText;
  dailyTasks[emptyIndex].done = false;
  dailyTasks[emptyIndex].projectId = projectId || null;
  dailyTasks[emptyIndex].subtaskId = subtaskId || null;
  saveDaily();
  renderDailyTasks();
  renderSubtasks();
  showStatusToast("Added to today's three.");
  return true;
}

function completeDailyTask(index: number): void {
  if (dailyTasks[index].done) return;
  dailyTasks[index].done = true;
  saveDaily();
  addLedger(dailyTasks[index].text, "Daily task");
  if (dailyTasks[index].projectId && dailyTasks[index].subtaskId) {
    completeLinkedSubtask(dailyTasks[index].projectId, dailyTasks[index].subtaskId);
  }
  renderDailyTasks();
  showStatusToast("Daily task completed.");
}

function findProject(projectId: string): ProjectLookup | null {
  for (const column of kanbanColumns) {
    const index = kanban[column].findIndex((item) => item.id === projectId);
    if (index !== -1) return { column, index, item: kanban[column][index] };
  }
  return null;
}

function completeLinkedSubtask(projectId: string, subtaskId: string): void {
  const found = findProject(projectId);
  if (!found) return;
  const subtask = found.item.subtasks.find((item) => item.id === subtaskId);
  if (!subtask) return;
  subtask.done = true;
  maybeCompleteProject(found);
  saveKanban();
  renderKanban();
  renderSubtasks();
}

function maybeCompleteProject(found: ProjectLookup | null): void {
  if (!found) return;
  if (found.column !== "This Week") return;
  if (!found.item.subtasks.length) return;
  if (!found.item.subtasks.every((subtask) => subtask.done)) return;
  const [project] = kanban[found.column].splice(found.index, 1);
  kanban.Complete.push(project);
  addLedger(project.title, "Project");
  showStatusToast("Project completed. All subtasks are done.");
}

function renderDailyTasks(): void {
  const list = byId("daily-task-list");
  list.replaceChildren();
  const editing = isEditMode();

  dailyTasks.forEach((task, index) => {
    const row = createElement("div", "task-row");

    const input = document.createElement("input");
    input.type = "text";
    input.value = task.text;
    input.placeholder = `Task ${index + 1}`;
    input.autocomplete = "off";
    input.readOnly = !editing;
    input.addEventListener("input", () => {
      if (!editing) return;
      dailyTasks[index].text = input.value;
      dailyTasks[index].projectId = null;
      dailyTasks[index].subtaskId = null;
      saveDaily();
    });

    const button = document.createElement("button");
    button.type = "button";
    button.className = "complete-button";
    button.textContent = task.done ? "Done" : "Complete";
    button.disabled = task.done;
    button.addEventListener("click", () => {
      completeDailyTask(index);
    });

    row.append(input, button);
    list.append(row);
  });
}

function renderFocus(): void {
  const editing = isEditMode();
  const fields: Record<keyof WeeklyFocus, HTMLInputElement> = {
    main: byId("focus-main"),
    secondary: byId("focus-secondary"),
    health: byId("focus-health")
  };

  Object.entries(fields).forEach(([key, input]) => {
    const focusKey = key as keyof WeeklyFocus;
    input.value = weeklyFocus[focusKey] || "";
    input.readOnly = !editing;
    input.oninput = () => {
      if (!isEditMode()) return;
      weeklyFocus = { ...weeklyFocus, [focusKey]: input.value };
      saveFocus();
    };
    input.onchange = () => {
      if (!isEditMode()) return;
      weeklyFocus = { ...weeklyFocus, [focusKey]: input.value };
      saveFocus();
    };
  });

  saveFocus();
}

function renderCalendar(): void {
  const wrap = byId("calendar-wrap");
  const stats = getMonthStats(visibleCalendarMonth);
  wrap.replaceChildren(renderCalendarControls(), renderCalendarStats(stats), renderMonth(visibleCalendarMonth));
  byId("chain-count").textContent = `${stats.currentStreak} day streak`;
}

function renderCalendarControls(): HTMLElement {
  const controls = createElement("div", "calendar-controls");
  const previous = document.createElement("button");
  previous.type = "button";
  previous.className = "calendar-nav-button";
  previous.textContent = "<";
  previous.setAttribute("aria-label", "Show previous month");
  previous.addEventListener("click", () => {
    visibleCalendarMonth = addMonths(visibleCalendarMonth, -1);
    renderCalendar();
  });

  const current = createElement("div", "calendar-current");
  const label = createElement("strong", "", visibleCalendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" }));
  const hint = createElement("span", "", "Scroll the log by month");
  current.append(label, hint);

  const next = document.createElement("button");
  next.type = "button";
  next.className = "calendar-nav-button";
  next.textContent = ">";
  next.setAttribute("aria-label", "Show next month");
  next.addEventListener("click", () => {
    visibleCalendarMonth = addMonths(visibleCalendarMonth, 1);
    renderCalendar();
  });

  const jumpToToday = document.createElement("button");
  jumpToToday.type = "button";
  jumpToToday.className = "calendar-today-button";
  jumpToToday.textContent = "Today";
  jumpToToday.addEventListener("click", () => {
    visibleCalendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    renderCalendar();
  });

  controls.append(previous, current, next, jumpToToday);
  return controls;
}

function renderCalendarStats(stats: MonthStats): HTMLElement {
  const row = createElement("div", "calendar-stats");
  row.append(
    calendarStat("Month score", `${stats.marked}/${stats.daysInMonth}`),
    calendarStat("Current streak", `${stats.currentStreak}`),
    calendarStat("Best run", `${stats.bestStreak}`),
    calendarStat("Needle days", `${stats.totalMarked}`)
  );
  return row;
}

interface MonthStats {
  marked: number;
  daysInMonth: number;
  rate: number;
  bestStreak: number;
  currentStreak: number;
  totalMarked: number;
}

function getMonthStats(date: Date): MonthStats {
  const keys = getMonthDateKeys(date);
  const marked = keys.filter((dateKey) => calendar[dateKey]).length;
  const allKeys = getMarkedDateKeys();
  return {
    marked,
    daysInMonth: keys.length,
    rate: Math.round((marked / keys.length) * 100),
    bestStreak: getBestStreak(allKeys),
    currentStreak: getCurrentStreak(),
    totalMarked: allKeys.length
  };
}

function getMonthDateKeys(date: Date): string[] {
  const monthDate = new Date(date.getFullYear(), date.getMonth(), 1);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => toIsoDate(new Date(monthDate.getFullYear(), monthDate.getMonth(), index + 1)));
}

function getBestStreak(dateKeys: string[]): number {
  let best = 0;
  let current = 0;
  dateKeys.forEach((dateKey) => {
    if (calendar[dateKey]) {
      current += 1;
      best = Math.max(best, current);
      return;
    }
    current = 0;
  });
  return best;
}

function getMarkedDateKeys(): string[] {
  return Object.keys(calendar).filter((dateKey) => calendar[dateKey]).sort();
}

function getCurrentStreak(): number {
  return getStreakEndingAt(toIsoDate(today));
}

function getStreakEndingAt(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  let streak = 0;

  while (calendar[toIsoDate(date)]) {
    streak += 1;
    date.setDate(date.getDate() - 1);
  }

  return streak;
}

function getMilestoneMessage(dateKey: string): string {
  const milestones = [3, 7, 14, 30, 60, 100];
  const streak = getStreakEndingAt(dateKey);
  const total = getMarkedDateKeys().length;
  if (milestones.includes(streak)) return `${streak}-day streak reached.`;
  if (milestones.includes(total)) return `${total} total Xs logged.`;
  if (streak > 1) return `${streak}-day run.`;
  const next = milestones.find((milestone) => milestone > total);
  return next ? `${next - total} Xs to the next milestone.` : "Keep the chain alive.";
}

function calendarStat(label: string, value: string): HTMLElement {
  const stat = createElement("div", "calendar-stat");
  stat.append(createElement("strong", "", value), createElement("span", "", label));
  return stat;
}

function addMonths(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function renderMonth(date: Date): HTMLElement {
  const monthDate = new Date(date.getFullYear(), date.getMonth(), 1);
  const month = createElement("section", "calendar-month");
  const heading = createElement("h3", "", monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" }));
  const grid = createElement("div", "calendar-grid");

  ["M", "T", "W", "T", "F", "S", "S"].forEach((day) => {
    const cell = createElement("div", "weekday", day);
    grid.append(cell);
  });

  const firstDay = (monthDate.getDay() + 6) % 7;
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  for (let index = 0; index < firstDay; index += 1) {
    const empty = createElement("div", "day-cell is-empty");
    grid.append(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cellDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    const dateKey = toIsoDate(cellDate);
    const button = document.createElement("button");
    button.type = "button";
    button.className = [
      "day-cell",
      calendar[dateKey] ? "is-marked" : "",
      dateKey === isoDate ? "is-today" : "",
      dateKey === lastMarkedDateKey ? "is-fresh" : ""
    ].filter(Boolean).join(" ");
    button.textContent = String(day);
    button.setAttribute("aria-label", `Mark that you moved the needle on ${dateKey}.`);
    button.addEventListener("click", () => {
      const wasMarked = Boolean(calendar[dateKey]);
      calendar[dateKey] = !wasMarked;
      if (!calendar[dateKey]) delete calendar[dateKey];
      setJson(storageKeys.calendar, calendar);
      lastMarkedDateKey = wasMarked ? "" : dateKey;
      renderCalendar();
      if (!wasMarked) showCalendarCelebration(dateKey);
    });
    grid.append(button);
  }

  month.append(heading, grid);
  return month;
}

function showCalendarCelebration(dateKey: string): void {
  showStatusToast(`Huzzah! X earned for ${formatDate(dateKey)}. ${getMilestoneMessage(dateKey)}`);
}

function showStatusToast(message: string): void {
  let toast = document.querySelector<HTMLDivElement>(".x-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "x-toast";
    toast.setAttribute("role", "status");
    document.body.append(toast);
  }

  toast.textContent = message;
  toast.classList.remove("is-visible");
  window.setTimeout(() => toast?.classList.add("is-visible"), 20);
  if (celebrationTimer) window.clearTimeout(celebrationTimer);
  celebrationTimer = window.setTimeout(() => toast?.classList.remove("is-visible"), 2400);
}

function renderKanban(): void {
  const board = byId("kanban-board");
  board.replaceChildren();
  const editing = isEditMode();

  kanbanColumns.forEach((column, columnIndex) => {
    const section = createElement("section", "kanban-column");
    section.dataset.column = column;
    section.addEventListener("dragover", (event) => {
      if (!isEditMode()) return;
      event.preventDefault();
      section.classList.add("is-drag-over");
    });
    section.addEventListener("dragleave", () => section.classList.remove("is-drag-over"));
    section.addEventListener("drop", (event) => {
      event.preventDefault();
      section.classList.remove("is-drag-over");
      if (!isEditMode()) return;
      if (dragSource) moveProject(dragSource.column, dragSource.index, column);
    });

    const heading = createElement("div", "kanban-column-header");
    heading.append(createElement("h3", "", column), createElement("span", "", `${kanban[column].length}`));
    const list = createElement("div", "kanban-list");

    kanban[column].forEach((item, itemIndex) => {
      const card = createElement("article", `kanban-card priority-${item.priority}`);
      card.tabIndex = 0;
      card.draggable = editing;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `${editing ? "Edit" : "View"} ${item.title}`);
      card.addEventListener("dragstart", () => {
        if (!isEditMode()) return;
        dragSource = { column, index: itemIndex };
        card.classList.add("is-dragging");
      });
      card.addEventListener("dragend", () => {
        dragSource = null;
        card.classList.remove("is-dragging");
      });
      card.addEventListener("click", () => openWorkEditor(column, itemIndex));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openWorkEditor(column, itemIndex);
        }
      });

      const title = createElement("h4", "", item.title);
      const meta = createElement("div", "work-meta");
      meta.append(
        pill(formatDate(item.date), "date-pill"),
        pill(item.priority, `priority-pill priority-${item.priority}`),
        pill(remainingLabel(item), "date-pill")
      );
      const description = createElement("p", "", item.description || "No description yet.");
      const progress = renderProjectProgress(item);

      const actions = createElement("div", "card-actions");
      const left = actionButton("<", "Move left", (event) => {
        event.stopPropagation();
        moveProject(column, itemIndex, kanbanColumns[columnIndex - 1]);
      });
      const right = actionButton(">", "Move right", (event) => {
        event.stopPropagation();
        moveProject(column, itemIndex, kanbanColumns[columnIndex + 1]);
      });
      left.disabled = columnIndex === 0;
      right.disabled = columnIndex === kanbanColumns.length - 1;
      actions.append(left, right);
      card.append(title, meta, progress, description, actions);
      list.append(card);
    });

    if (!kanban[column].length) {
      const empty = createElement("span", "empty-note", "Empty");
      list.append(empty);
    }

    section.append(heading, list);
    board.append(section);
  });
}

function pill(text: string, className: string): HTMLSpanElement {
  return createElement("span", className, text);
}

function countDoneSubtasks(item: KanbanItem): number {
  return item.subtasks.filter((subtask) => subtask.done).length;
}

function remainingLabel(item: KanbanItem): string {
  const total = item.subtasks.length;
  if (!total) return "No tasks yet";
  const remaining = total - countDoneSubtasks(item);
  if (remaining === 0) return "All done";
  return `${remaining} task${remaining === 1 ? "" : "s"} left`;
}

function renderProjectProgress(item: KanbanItem): HTMLElement {
  const total = item.subtasks.length;
  const done = countDoneSubtasks(item);
  const percent = total ? Math.round((done / total) * 100) : 0;
  const wrap = createElement("div", "project-progress");
  const track = createElement("div", "progress-track");
  const bar = createElement("span", "progress-bar");
  bar.style.width = `${percent}%`;
  track.append(bar);
  wrap.append(track, createElement("span", "", total ? `${percent}% complete` : "No subtasks yet"));
  return wrap;
}

function actionButton(text: string, label: string, handler: (event: MouseEvent) => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "move-button";
  button.dataset.editOnly = "";
  button.textContent = text;
  button.title = label;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", handler);
  return button;
}

function moveProject(fromColumn: KanbanColumn, fromIndex: number, toColumn: KanbanColumn | undefined): void {
  if (!toColumn || fromColumn === toColumn) return;
  const [item] = kanban[fromColumn].splice(fromIndex, 1);
  kanban[toColumn].push(item);
  if (toColumn === "Complete") {
    addLedger(item.title, "Project");
    showStatusToast("Project moved to Complete.");
  }
  if (toColumn === "Parking Lot") showStatusToast("Project moved to Parking Lot.");
  saveKanban();
  renderKanban();
}

function openWorkEditor(column: KanbanColumn, index: number): void {
  selectedWork = { column, index };
  const item = kanban[column][index];
  const editing = isEditMode();
  byId("work-modal-title").textContent = editing ? "Edit project" : "Project details";
  byId<HTMLInputElement>("work-title").value = item.title;
  byId<HTMLInputElement>("work-date").value = item.date || isoDate;
  byId<HTMLTextAreaElement>("work-description").value = item.description || "";
  byId<HTMLSelectElement>("work-priority").value = item.priority || "medium";
  applyWorkEditorMode();
  const parkingButton = byId<HTMLButtonElement>("park-project");
  parkingButton.disabled = column === "Parking Lot";
  parkingButton.textContent = column === "Parking Lot" ? "Already parked" : "Move to Parking Lot";
  renderSubtasks();
  byId<HTMLDialogElement>("work-modal").showModal();
}

function applyWorkEditorMode(): void {
  const editing = isEditMode();
  const title = document.getElementById("work-title") as HTMLInputElement | null;
  const date = document.getElementById("work-date") as HTMLInputElement | null;
  const description = document.getElementById("work-description") as HTMLTextAreaElement | null;
  const priority = document.getElementById("work-priority") as HTMLSelectElement | null;
  const modalTitle = document.getElementById("work-modal-title");
  if (modalTitle) modalTitle.textContent = editing ? "Edit project" : "Project details";
  if (title) title.readOnly = !editing;
  if (date) date.readOnly = !editing;
  if (description) description.readOnly = !editing;
  if (priority) priority.disabled = !editing;
}

function getSelectedProject(): KanbanItem | null {
  if (!selectedWork) return null;
  return kanban[selectedWork.column]?.[selectedWork.index] || null;
}

function renderSubtasks(): void {
  const editor = byId("subtask-editor");
  const item = getSelectedProject();
  if (!editor || !item) return;
  editor.replaceChildren();
  const editing = isEditMode();

  item.subtasks.forEach((subtask, index) => {
    const row = createElement("div", "subtask-row");
    if (subtask.done) row.classList.add("is-complete");
    const input = document.createElement("input");
    input.type = "text";
    input.value = subtask.text;
    input.placeholder = `Subtask ${index + 1}`;
    input.readOnly = !editing;
    input.addEventListener("input", () => {
      if (!isEditMode()) return;
      item.subtasks[index].text = input.value;
    });
    const status = createElement("span", "subtask-status", subtask.done ? "Complete" : "Open");
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "text-button";
    addButton.dataset.editOnly = "";
    addButton.textContent = subtask.done ? "Done" : "Use today";
    addButton.disabled = subtask.done || !dailyTasks.some((task) => !task.text.trim());
    addButton.addEventListener("click", () => addTaskToDaily(input.value, item.id, subtask.id));
    row.append(input, status, addButton);
    editor.append(row);
  });

  const addSubtask = document.createElement("button");
  addSubtask.type = "button";
  addSubtask.className = "text-button";
  addSubtask.dataset.editOnly = "";
  addSubtask.textContent = item.subtasks.length >= 6 ? "6 subtasks max" : "Add subtask";
  addSubtask.disabled = item.subtasks.length >= 6;
  addSubtask.addEventListener("click", () => {
    item.subtasks.push(normalizeSubtask(""));
    renderSubtasks();
  });
  editor.append(addSubtask);
}

function renderLedger(): void {
  const ledger = byId("done-ledger");
  const archive = byId("ledger-archive");
  ledger.replaceChildren();
  archive.replaceChildren();
  if (!doneLedger.length) {
    const empty = createElement("li", "empty-note", "Nothing completed yet.");
    ledger.append(empty);
    archive.append(empty.cloneNode(true));
    return;
  }

  doneLedger.slice(0, 4).forEach((item, index) => {
    ledger.append(renderLedgerItem(item, index, false));
  });

  doneLedger.forEach((item, index) => {
    archive.append(renderLedgerItem(item, index, true));
  });
}

function renderLedgerItem(item: LedgerItem, index: number, canDelete: boolean): HTMLLIElement {
  const row = document.createElement("li");
  const content = document.createElement("div");
  const date = new Date(item.date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
  content.textContent = item.text;
  const meta = createElement("span", "ledger-meta", `${item.source} - ${date}`);
  content.append(meta);
  row.append(content);

  if (canDelete) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "delete-button";
    button.textContent = "x";
    button.setAttribute("aria-label", `Delete completed task ${item.text}`);
    button.addEventListener("click", () => {
      doneLedger.splice(index, 1);
      setJson(storageKeys.doneLedger, doneLedger);
      renderLedger();
    });
    row.append(button);
  }

  return row;
}

function bindEvents(): void {
  byId("reset-day").addEventListener("click", () => {
    dailyTasks = normalizeDailyTasks([]);
    saveDaily();
    renderDailyTasks();
    renderSubtasks();
  });

  byId<HTMLFormElement>("kanban-add-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = byId<HTMLInputElement>("kanban-add-input");
    const title = input.value.trim();
    if (!title) return;
    kanban.Ideas.push(projectItem(title, "", "medium", []));
    saveKanban();
    input.value = "";
    renderKanban();
  });

  byId<HTMLFormElement>("work-form").addEventListener("submit", (event) => {
    if ((event.submitter as HTMLButtonElement | null)?.value !== "save" || !selectedWork) return;
    event.preventDefault();
    if (!isEditMode()) return;
    const item = getSelectedProject();
    if (!item) return;
    item.title = byId<HTMLInputElement>("work-title").value.trim() || "Untitled project";
    item.date = byId<HTMLInputElement>("work-date").value || isoDate;
    item.description = byId<HTMLTextAreaElement>("work-description").value.trim();
    item.priority = byId<HTMLSelectElement>("work-priority").value as Priority;
    item.subtasks = item.subtasks.map(normalizeSubtask).filter((subtask) => subtask.text.trim()).slice(0, 6);
    maybeCompleteProject(findProject(item.id));
    saveKanban();
    renderKanban();
    byId<HTMLDialogElement>("work-modal").close();
  });

  byId("park-project").addEventListener("click", () => {
    if (!selectedWork || selectedWork.column === "Parking Lot") return;
    moveProject(selectedWork.column, selectedWork.index, "Parking Lot");
    byId<HTMLDialogElement>("work-modal").close();
  });

  byId("open-ledger-archive").addEventListener("click", () => {
    byId<HTMLDialogElement>("ledger-modal").showModal();
  });

  byId("close-ledger-archive").addEventListener("click", () => {
    byId<HTMLDialogElement>("ledger-modal").close();
  });
}
