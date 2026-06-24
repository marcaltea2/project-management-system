import { TaskStatus, type Priority } from "@prisma/client";

export const TASK_STATUS_OPTIONS = [
  { value: TaskStatus.IN_REVIEW, label: "In Review" },
  { value: TaskStatus.TODO, label: "To Do" },
  { value: TaskStatus.IN_PROGRESS, label: "In Progress" },
  { value: TaskStatus.DONE, label: "Done" },
] as const;


export type Filter = "all" | TaskStatus;
export type View = "list" | "board";

export const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "TODO", label: "Todo" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "IN_REVIEW", label: "In Review" },
  { id: "DONE", label: "Done" },
];

export const PRIORITY_DOT: Record<Priority, string> = {
  HIGH: "bg-red-500",
  URGENT: "bg-red-600",
  MEDIUM: "bg-amber-500",
  LOW: "bg-emerald-500",
};

export const COLUMN_STYLES: Record<TaskStatus, { dot: string; badge: string }> = {
  TODO: { 
    dot: "bg-muted-foreground", 
    badge: "" },
  IN_PROGRESS: {
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400",
  },
  IN_REVIEW: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400",
  },
  DONE: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400",
  },
};

export const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "TODO", label: "Todo" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "IN_REVIEW", label: "In Review" },
  { id: "DONE", label: "Done" },
];