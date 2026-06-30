(function () {
  const storage = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
      } catch (error) {
        return fallback;
      }
    },
    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  };

  const today = new Date();
  const isoDate = toIsoDate(today);
  const keys = {
    daily: `lifeCompass.dailyTasks.${isoDate}`,
    weekly: `lifeCompass.weeklyFocus.${getWeekKey(today)}`,
    calendar: "lifeCompass.calendar",
    kanban: "lifeCompass.kanban",
    parkingLot: "lifeCompass.parkingLot",
    doneLedger: "lifeCompass.doneLedger",
    strategy: "lifeCompass.strategy"
  };

  const kanbanColumns = ["Ideas", "This Week", "Complete", "Parking Lot"];
  const defaultFocus = {
    main: "Write project brief",
    secondary: "Review prototype",
    health: "Move for 20 minutes"
  };

  let dailyTasks = normalizeDailyTasks(storage.get(keys.daily, []));
  let weeklyFocus = normalizeFocus(storage.get(keys.weekly, defaultFocus));
  let calendar = storage.get(keys.calendar, {});
  let kanban = normalizeKanban(storage.get(keys.kanban, defaultKanban()), storage.get(keys.parkingLot, null));
  let doneLedger = normalizeLedger(storage.get(keys.doneLedger, []));
  let selectedWork = null;
  let dragSource = null;

  function defaultKanban() {
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

  function toIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getWeekKey(date) {
    const cleanDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNumber = cleanDate.getUTCDay() || 7;
    cleanDate.setUTCDate(cleanDate.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(cleanDate.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((cleanDate - yearStart) / 86400000 + 1) / 7);
    return `${cleanDate.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
  }

  function projectItem(title, description, priority, subtasks) {
    return {
      id: makeId(),
      title,
      date: isoDate,
      description: description || "",
      priority: priority || "medium",
      subtasks: (subtasks || []).slice(0, 6).map(normalizeSubtask)
    };
  }

  function makeId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random()}`;
  }

  function normalizeDailyTasks(tasks) {
    const normalized = Array.isArray(tasks) ? tasks.slice(0, 3) : [];
    while (normalized.length < 3) normalized.push({ text: "", done: false });
    return normalized.map((task) => ({
      text: typeof task === "string" ? task : task.text || "",
      done: Boolean(task.done),
      projectId: typeof task === "string" ? null : task.projectId || null,
      subtaskId: typeof task === "string" ? null : task.subtaskId || null
    }));
  }

  function normalizeFocus(value) {
    return {
      main: value.main || defaultFocus.main,
      secondary: value.secondary || defaultFocus.secondary,
      health: value.health || value.finish || defaultFocus.health
    };
  }

  function normalizeKanban(value, parkingLot) {
    const source = {
      Ideas: [...(value.Ideas || []), ...(value.Backlog || [])],
      "This Week": value["This Week"] || [],
      Complete: [...(value.Complete || []), ...(value.Done || [])],
      "Parking Lot": Array.isArray(parkingLot) ? parkingLot : [...(value["Parking Lot"] || []), ...(value.Parking || [])]
    };
    const normalized = {};
    kanbanColumns.forEach((column) => {
      normalized[column] = (source[column] || []).map((item) => {
        if (typeof item === "string") return projectItem(item, "", "medium", []);
        return {
          id: item.id || makeId(),
          title: item.title || item.text || "Untitled project",
          date: item.date || isoDate,
          description: item.description || "",
          priority: ["low", "medium", "high"].includes(item.priority) ? item.priority : "medium",
          subtasks: Array.isArray(item.subtasks) ? item.subtasks.slice(0, 6).map(normalizeSubtask) : []
        };
      });
    });
    return normalized;
  }

  function normalizeSubtask(subtask) {
    if (typeof subtask === "string") {
      return { id: makeId(), text: subtask, done: false };
    }
    return {
      id: subtask.id || makeId(),
      text: subtask.text || "",
      done: Boolean(subtask.done)
    };
  }

  function normalizeLedger(items) {
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

  function saveDaily() {
    storage.set(keys.daily, dailyTasks);
  }

  function saveFocus() {
    storage.set(keys.weekly, weeklyFocus);
    const summary = [weeklyFocus.main, weeklyFocus.secondary, weeklyFocus.health].filter(Boolean).join(" + ");
    document.getElementById("weekly-focus-summary").textContent = summary || "Set this week's focus";
  }

  function renderNorthStar() {
    const strategy = storage.get(keys.strategy, {});
    document.getElementById("execution-north-star").textContent = strategy.northStar || "Build a meaningful career";
  }

  function saveKanban() {
    storage.set(keys.kanban, kanban);
    storage.set(keys.parkingLot, kanban["Parking Lot"]);
  }

  function addLedger(text, source) {
    if (!text.trim()) return;
    doneLedger = [
      { text: text.trim(), source, date: new Date().toISOString() },
      ...doneLedger
    ];
    storage.set(keys.doneLedger, doneLedger);
    renderLedger();
  }

  function addTaskToDaily(text, projectId, subtaskId) {
    const cleanText = text.trim();
    if (!cleanText) return false;
    const emptyIndex = dailyTasks.findIndex((task) => !task.text.trim());
    if (emptyIndex === -1) return false;
    dailyTasks[emptyIndex].text = cleanText;
    dailyTasks[emptyIndex].done = false;
    dailyTasks[emptyIndex].projectId = projectId || null;
    dailyTasks[emptyIndex].subtaskId = subtaskId || null;
    saveDaily();
    renderDailyTasks();
    renderSubtasks();
    return true;
  }

  function completeDailyTask(index) {
    if (dailyTasks[index].done) return;
    dailyTasks[index].done = true;
    saveDaily();
    addLedger(dailyTasks[index].text, "Daily task");
    if (dailyTasks[index].projectId && dailyTasks[index].subtaskId) {
      completeLinkedSubtask(dailyTasks[index].projectId, dailyTasks[index].subtaskId);
    }
    renderDailyTasks();
  }

  function findProject(projectId) {
    for (const column of kanbanColumns) {
      const index = kanban[column].findIndex((item) => item.id === projectId);
      if (index !== -1) return { column, index, item: kanban[column][index] };
    }
    return null;
  }

  function completeLinkedSubtask(projectId, subtaskId) {
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

  function maybeCompleteProject(found) {
    if (!found) return;
    if (found.column !== "This Week") return;
    if (!found.item.subtasks.length) return;
    if (!found.item.subtasks.every((subtask) => subtask.done)) return;
    const [project] = kanban[found.column].splice(found.index, 1);
    kanban.Complete.push(project);
    addLedger(project.title, "Project");
  }

  function renderDailyTasks() {
    const list = document.getElementById("daily-task-list");
    list.replaceChildren();

    dailyTasks.forEach((task, index) => {
      const row = document.createElement("div");
      row.className = "task-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.done;
      checkbox.setAttribute("aria-label", `Mark task ${index + 1} complete`);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          completeDailyTask(index);
          return;
        }
        dailyTasks[index].done = false;
        saveDaily();
        renderDailyTasks();
      });

      const input = document.createElement("input");
      input.type = "text";
      input.value = task.text;
      input.placeholder = `Task ${index + 1}`;
      input.autocomplete = "off";
      input.addEventListener("input", () => {
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

      row.append(checkbox, input, button);
      list.append(row);
    });
  }

  function renderFocus() {
    const fields = {
      main: document.getElementById("focus-main"),
      secondary: document.getElementById("focus-secondary"),
      health: document.getElementById("focus-health")
    };

    Object.entries(fields).forEach(([key, input]) => {
      input.value = weeklyFocus[key] || "";
      input.addEventListener("input", () => {
        weeklyFocus = { ...weeklyFocus, [key]: input.value };
        saveFocus();
      });
      input.addEventListener("change", () => {
        weeklyFocus = { ...weeklyFocus, [key]: input.value };
        saveFocus();
      });
    });

    saveFocus();
  }

  function renderCalendar() {
    const wrap = document.getElementById("calendar-wrap");
    wrap.replaceChildren(renderMonth(today), renderMonth(new Date(today.getFullYear(), today.getMonth() + 1, 1)));
    const markedCount = Object.values(calendar).filter(Boolean).length;
    document.getElementById("chain-count").textContent = `${markedCount} needle days`;
  }

  function renderMonth(date) {
    const monthDate = new Date(date.getFullYear(), date.getMonth(), 1);
    const month = document.createElement("section");
    month.className = "calendar-month";
    const heading = document.createElement("h3");
    heading.textContent = monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const grid = document.createElement("div");
    grid.className = "calendar-grid";

    ["M", "T", "W", "T", "F", "S", "S"].forEach((day) => {
      const cell = document.createElement("div");
      cell.className = "weekday";
      cell.textContent = day;
      grid.append(cell);
    });

    const firstDay = (monthDate.getDay() + 6) % 7;
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    for (let i = 0; i < firstDay; i += 1) {
      const empty = document.createElement("div");
      empty.className = "day-cell is-empty";
      grid.append(empty);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const cellDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
      const dateKey = toIsoDate(cellDate);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `day-cell${calendar[dateKey] ? " is-marked" : ""}`;
      button.textContent = String(day);
      button.setAttribute("aria-label", `Mark that you moved the needle on ${dateKey}`);
      button.addEventListener("click", () => {
        calendar[dateKey] = !calendar[dateKey];
        if (!calendar[dateKey]) delete calendar[dateKey];
        storage.set(keys.calendar, calendar);
        renderCalendar();
      });
      grid.append(button);
    }

    month.append(heading, grid);
    return month;
  }

  function renderKanban() {
    const board = document.getElementById("kanban-board");
    board.replaceChildren();

    kanbanColumns.forEach((column, columnIndex) => {
      const section = document.createElement("section");
      section.className = "kanban-column";
      section.dataset.column = column;
      section.addEventListener("dragover", (event) => {
        event.preventDefault();
        section.classList.add("is-drag-over");
      });
      section.addEventListener("dragleave", () => section.classList.remove("is-drag-over"));
      section.addEventListener("drop", (event) => {
        event.preventDefault();
        section.classList.remove("is-drag-over");
        if (dragSource) moveProject(dragSource.column, dragSource.index, column);
      });

      const heading = document.createElement("h3");
      heading.textContent = column;
      const list = document.createElement("div");
      list.className = "kanban-list";

      kanban[column].forEach((item, itemIndex) => {
        const card = document.createElement("article");
        card.className = `kanban-card priority-${item.priority}`;
        card.tabIndex = 0;
        card.draggable = true;
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", `Edit ${item.title}`);
        card.addEventListener("dragstart", () => {
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

        const title = document.createElement("h4");
        title.textContent = item.title;
        const meta = document.createElement("div");
        meta.className = "work-meta";
        meta.append(
          pill(formatDate(item.date), "date-pill"),
          pill(item.priority, `priority-pill priority-${item.priority}`),
          pill(`${countDoneSubtasks(item)}/${item.subtasks.length || 0} done`, "date-pill"),
          pill(`${item.subtasks.length}/6 subtasks`, "date-pill")
        );
        const description = document.createElement("p");
        description.textContent = item.description || "No description yet.";

        const actions = document.createElement("div");
        actions.className = "card-actions";
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
        card.append(title, meta, description, actions);
        list.append(card);
      });

      if (!kanban[column].length) {
        const empty = document.createElement("span");
        empty.className = "empty-note";
        empty.textContent = "Empty";
        list.append(empty);
      }

      section.append(heading, list);
      board.append(section);
    });
  }

  function pill(text, className) {
    const element = document.createElement("span");
    element.className = className;
    element.textContent = text;
    return element;
  }

  function countDoneSubtasks(item) {
    return item.subtasks.filter((subtask) => subtask.done).length;
  }

  function formatDate(value) {
    if (!value) return "No date";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }

  function actionButton(text, label, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "move-button";
    button.textContent = text;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.addEventListener("click", handler);
    return button;
  }

  function moveProject(fromColumn, fromIndex, toColumn) {
    if (!toColumn || fromColumn === toColumn) return;
    const [item] = kanban[fromColumn].splice(fromIndex, 1);
    kanban[toColumn].push(item);
    if (toColumn === "Complete") addLedger(item.title, "Project");
    saveKanban();
    renderKanban();
  }

  function openWorkEditor(column, index) {
    selectedWork = { column, index };
    const item = kanban[column][index];
    document.getElementById("work-title").value = item.title;
    document.getElementById("work-date").value = item.date || isoDate;
    document.getElementById("work-description").value = item.description || "";
    document.getElementById("work-priority").value = item.priority || "medium";
    const parkingButton = document.getElementById("park-project");
    parkingButton.disabled = column === "Parking Lot";
    parkingButton.textContent = column === "Parking Lot" ? "Already parked" : "Move to Parking Lot";
    renderSubtasks();
    document.getElementById("work-modal").showModal();
  }

  function getSelectedProject() {
    if (!selectedWork) return null;
    return kanban[selectedWork.column]?.[selectedWork.index] || null;
  }

  function renderSubtasks() {
    const editor = document.getElementById("subtask-editor");
    const item = getSelectedProject();
    if (!editor || !item) return;
    editor.replaceChildren();

    item.subtasks.forEach((subtask, index) => {
      const row = document.createElement("div");
      row.className = "subtask-row";
      if (subtask.done) row.classList.add("is-complete");
      const input = document.createElement("input");
      input.type = "text";
      input.value = subtask.text;
      input.placeholder = `Subtask ${index + 1}`;
      input.addEventListener("input", () => {
        item.subtasks[index].text = input.value;
      });
      const status = document.createElement("span");
      status.className = "subtask-status";
      status.textContent = subtask.done ? "Complete" : "Open";
      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "text-button";
      addButton.textContent = subtask.done ? "Done" : "Use today";
      addButton.disabled = subtask.done || !dailyTasks.some((task) => !task.text.trim());
      addButton.addEventListener("click", () => addTaskToDaily(input.value, item.id, subtask.id));
      row.append(input, status, addButton);
      editor.append(row);
    });

    const addSubtask = document.createElement("button");
    addSubtask.type = "button";
    addSubtask.className = "text-button";
    addSubtask.textContent = item.subtasks.length >= 6 ? "6 subtasks max" : "Add subtask";
    addSubtask.disabled = item.subtasks.length >= 6;
    addSubtask.addEventListener("click", () => {
      item.subtasks.push(normalizeSubtask(""));
      renderSubtasks();
    });
    editor.append(addSubtask);
  }

  function renderLedger() {
    const ledger = document.getElementById("done-ledger");
    const archive = document.getElementById("ledger-archive");
    ledger.replaceChildren();
    if (archive) archive.replaceChildren();
    if (!doneLedger.length) {
      const empty = document.createElement("li");
      empty.className = "empty-note";
      empty.textContent = "Nothing completed yet.";
      ledger.append(empty);
      if (archive) archive.append(empty.cloneNode(true));
      return;
    }

    doneLedger.slice(0, 4).forEach((item, index) => {
      ledger.append(renderLedgerItem(item, index, false));
    });

    doneLedger.forEach((item, index) => {
      archive.append(renderLedgerItem(item, index, true));
    });
  }

  function renderLedgerItem(item, index, canDelete) {
    const row = document.createElement("li");
    const content = document.createElement("div");
    const date = new Date(item.date).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
    content.textContent = item.text;
    const meta = document.createElement("span");
    meta.className = "ledger-meta";
    meta.textContent = `${item.source} - ${date}`;
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
        storage.set(keys.doneLedger, doneLedger);
        renderLedger();
      });
      row.append(button);
    }

    return row;
  }

  document.getElementById("today-label").textContent = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  document.getElementById("reset-day").addEventListener("click", () => {
    dailyTasks = normalizeDailyTasks([]);
    saveDaily();
    renderDailyTasks();
    renderSubtasks();
  });

  document.getElementById("kanban-add-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("kanban-add-input");
    const title = input.value.trim();
    if (!title) return;
    kanban.Ideas.push(projectItem(title, "", "medium", []));
    saveKanban();
    input.value = "";
    renderKanban();
  });

  document.getElementById("work-form").addEventListener("submit", (event) => {
    if (event.submitter?.value !== "save" || !selectedWork) return;
    event.preventDefault();
    const item = getSelectedProject();
    if (!item) return;
    item.title = document.getElementById("work-title").value.trim() || "Untitled project";
    item.date = document.getElementById("work-date").value || isoDate;
    item.description = document.getElementById("work-description").value.trim();
    item.priority = document.getElementById("work-priority").value;
    item.subtasks = item.subtasks.map(normalizeSubtask).filter((subtask) => subtask.text.trim()).slice(0, 6);
    maybeCompleteProject(findProject(item.id));
    saveKanban();
    renderKanban();
    document.getElementById("work-modal").close();
  });

  document.getElementById("park-project").addEventListener("click", () => {
    if (!selectedWork || selectedWork.column === "Parking Lot") return;
    moveProject(selectedWork.column, selectedWork.index, "Parking Lot");
    document.getElementById("work-modal").close();
  });

  document.getElementById("open-ledger-archive").addEventListener("click", () => {
    document.getElementById("ledger-modal").showModal();
  });

  document.getElementById("close-ledger-archive").addEventListener("click", () => {
    document.getElementById("ledger-modal").close();
  });

  storage.set(keys.daily, dailyTasks);
  storage.set(keys.doneLedger, doneLedger);
  saveKanban();
  renderNorthStar();
  renderDailyTasks();
  renderFocus();
  renderCalendar();
  renderKanban();
  renderLedger();

  window.addEventListener("storage", (event) => {
    if (event.key === keys.strategy) renderNorthStar();
  });
  window.addEventListener("focus", renderNorthStar);
})();
