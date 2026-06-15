import { Priority, ProjectStatus, TaskStatus } from "@prisma/client";

export const PROJECT_STATUS_OPTIONS = [
  { value: ProjectStatus.ACTIVE, label: "Active" },
  { value: ProjectStatus.ON_HOLD, label: "On Hold" },
  { value: ProjectStatus.COMPLETED, label: "Completed" },
  { value: ProjectStatus.ARCHIVED, label: "Archived" },
] as const;

export const TASK_STATUS_OPTIONS = [
  { value: TaskStatus.IN_REVIEW, label: "In Review" },
  { value: TaskStatus.TODO, label: "To Do" },
  { value: TaskStatus.IN_PROGRESS, label: "In Progress" },
  { value: TaskStatus.DONE, label: "Done" },
] as const;

export const PRIORITY_OPTIONS = [
  { value: Priority.LOW, label: "Low" },
  { value: Priority.MEDIUM, label: "Medium" },
  { value: Priority.HIGH, label: "High" },
  { value: Priority.URGENT, label: "Urgent" },
] as const;

export const COLOR_OPTIONS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Pink" },
  { value: "#f97316", label: "Orange" },
  { value: "#22c55e", label: "Green" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#3b82f6", label: "Blue" },
] as const;