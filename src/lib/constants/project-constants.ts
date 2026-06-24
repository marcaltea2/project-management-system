import { Priority, ProjectStatus } from "@prisma/client";

export const PROJECT_STATUS_OPTIONS = [
  { value: ProjectStatus.ACTIVE, label: "Active" },
  { value: ProjectStatus.ON_HOLD, label: "On Hold" },
  { value: ProjectStatus.COMPLETED, label: "Completed" },
  { value: ProjectStatus.ARCHIVED, label: "Archived" },
] as const;

export const PRIORITY_OPTIONS = [
  { value: Priority.LOW, label: "Low" },
  { value: Priority.MEDIUM, label: "Medium" },
  { value: Priority.HIGH, label: "High" },
  { value: Priority.URGENT, label: "Urgent" },
] as const;

export const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  ACTIVE:"bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  COMPLETED:"bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  ON_HOLD:"bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  ARCHIVED:"bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export const PRIORITY_COLOR: Record<Priority, string> =
  {
    LOW: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    MEDIUM:"bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
    HIGH: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
    URGENT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

export const COLOR_OPTIONS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Pink" },
  { value: "#f97316", label: "Orange" },
  { value: "#22c55e", label: "Green" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#3b82f6", label: "Blue" },
] as const;
