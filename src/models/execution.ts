export type Priority = "low" | "medium" | "high";

export interface DailyTask {
  text: string;
  done: boolean;
  projectId: string | null;
  subtaskId: string | null;
}

export interface WeeklyFocus {
  main: string;
  secondary: string;
  health: string;
}

export interface Subtask {
  id: string;
  text: string;
  done: boolean;
}

export interface KanbanItem {
  id: string;
  title: string;
  date: string;
  description: string;
  priority: Priority;
  subtasks: Subtask[];
}

export type KanbanColumn = "Ideas" | "This Week" | "Complete" | "Parking Lot";

export type KanbanBoard = Record<KanbanColumn, KanbanItem[]>;

export interface LedgerItem {
  text: string;
  source: "Daily task" | "Project" | "Completed task" | string;
  date: string;
}

export type CalendarMarks = Record<string, boolean>;
