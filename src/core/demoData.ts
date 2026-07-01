import { fallbackStrategy } from "../features/strategy/strategyDefaults";
import type { CalendarMarks, KanbanBoard, WeeklyFocus } from "../models/execution";
import { clearByNamespace, dailyKey, setJson, storageKeys, weeklyKey } from "./storage";
import { getWeekKey, toIsoDate } from "./dates";

function shiftDate(base: Date, offset: number): string {
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
  return toIsoDate(date);
}

export function loadDemoData(): void {
  const today = new Date();
  const isoDate = toIsoDate(today);
  const calendar: CalendarMarks = {};

  [-13, -12, -10, -9, -8, -5, -4, -3, -1, 0].forEach((offset) => {
    calendar[shiftDate(today, offset)] = true;
  });

  const focus: WeeklyFocus = {
    main: "Draft the project brief",
    secondary: "Review the prototype",
    health: "Run or walk for 20 minutes"
  };

  const kanban: KanbanBoard = {
    Ideas: [
      {
        id: "demo-public-checklist",
        title: "Create public checklist",
        date: isoDate,
        description: "Prepare the repository for safe sharing with demo data only.",
        priority: "medium",
        subtasks: [
          { id: "demo-review-readme", text: "Review README", done: false },
          { id: "demo-check-demo-data", text: "Check demo data only", done: false }
        ]
      }
    ],
    "This Week": [
      {
        id: "demo-project-brief",
        title: "Write project brief",
        date: isoDate,
        description: "Describe the goal, scope and next useful milestone.",
        priority: "high",
        subtasks: [
          { id: "demo-outline", text: "Outline the argument", done: true },
          { id: "demo-draft", text: "Draft the first version", done: false },
          { id: "demo-simplify", text: "Review and simplify", done: false }
        ]
      }
    ],
    Complete: [],
    "Parking Lot": []
  };

  clearByNamespace();
  setJson(storageKeys.strategy, fallbackStrategy);
  setJson(dailyKey(isoDate), [
    { text: "Draft the first version", done: false, projectId: "demo-project-brief", subtaskId: "demo-draft" },
    { text: "Review prototype", done: false, projectId: null, subtaskId: null },
    { text: "Run or walk for 20 minutes", done: false, projectId: null, subtaskId: null }
  ]);
  setJson(weeklyKey(getWeekKey(today)), focus);
  setJson(storageKeys.calendar, calendar);
  setJson(storageKeys.kanban, kanban);
  setJson(storageKeys.parkingLot, kanban["Parking Lot"]);
  setJson(storageKeys.doneLedger, [
    { text: "Outline the argument", source: "Daily task", date: new Date().toISOString() }
  ]);
  setJson(storageKeys.settings, { editMode: false });
}
