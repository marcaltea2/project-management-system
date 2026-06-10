"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";

import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Circle,
  Clock,
  CheckCircle2,
  Plus,
  List,
  Columns,
  GripVertical,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type Status = "todo" | "progress" | "done";
type Priority = "high" | "medium" | "low";
type Filter = "all" | Status;
type View = "list" | "board";

type Task = {
  id: number;
  title: string;
  status: Status;
  priority: Priority;
  assignee: string;
  assigneeColor: string;
  due: string;
};

// ── Data ─────────────────────────────────────────────────────────────────────

const INITIAL_TASKS: Task[] = [
  {
    id: 1,
    title: "Design system component library",
    status: "done",
    priority: "high",
    assignee: "AR",
    assigneeColor: "bg-violet-500",
    due: "Jun 10",
  },
  {
    id: 2,
    title: "Set up CI/CD pipeline",
    status: "progress",
    priority: "high",
    assignee: "SC",
    assigneeColor: "bg-amber-500",
    due: "Jun 15",
  },
  {
    id: 3,
    title: "User authentication flow",
    status: "progress",
    priority: "medium",
    assignee: "JL",
    assigneeColor: "bg-emerald-500",
    due: "Jun 20",
  },
  {
    id: 4,
    title: "API rate limiting",
    status: "todo",
    priority: "medium",
    assignee: "TK",
    assigneeColor: "bg-pink-500",
    due: "Jun 28",
  },
  {
    id: 5,
    title: "Write onboarding docs",
    status: "todo",
    priority: "low",
    assignee: "MS",
    assigneeColor: "bg-purple-500",
    due: "Jul 5",
  },
  {
    id: 6,
    title: "Performance audit",
    status: "todo",
    priority: "high",
    assignee: "AR",
    assigneeColor: "bg-violet-500",
    due: "Jul 12",
  },
];

const COLUMNS: { id: Status; label: string }[] = [
  { id: "todo", label: "Todo" },
  { id: "progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "todo", label: "Todo" },
  { id: "progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_ICON: Record<Status, React.ReactNode> = {
  done: <CheckCircle2 size={15} className="flex-shrink-0 text-emerald-500" />,
  progress: <Clock size={15} className="flex-shrink-0 text-amber-500" />,
  todo: <Circle size={15} className="text-muted-foreground flex-shrink-0" />,
};

const PRIORITY_COLOR: Record<Priority, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

const COLUMN_STYLES: Record<Status, { dot: string; badge: string }> = {
  todo: { dot: "bg-muted-foreground", badge: "" },
  progress: {
    dot: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400",
  },
  done: {
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400",
  },
};

// ── Sortable task card (board) ────────────────────────────────────────────────

function SortableTaskCard({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { status: task.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border-border hover:border-muted-foreground/30 flex cursor-pointer flex-col gap-3 rounded-lg border p-3 transition-colors",
        isDragging && "border-dashed opacity-40",
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground/40 hover:text-muted-foreground mt-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={13} />
        </button>
        <p className="flex-1 text-sm leading-snug">{task.title}</p>
        <span
          className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${PRIORITY_COLOR[task.priority]}`}
        />
      </div>
      <div className="flex items-center justify-between pl-5">
        <span className="text-muted-foreground font-mono text-[11px]">
          {task.due}
        </span>
        <div
          className={`h-6 w-6 rounded-full ${task.assigneeColor} flex items-center justify-center text-[9px] font-medium text-white`}
        >
          {task.assignee}
        </div>
      </div>
    </div>
  );
}

// Drag overlay card (ghost shown while dragging)
function DragOverlayCard({ task }: { task: Task }) {
  return (
    <div className="bg-card border-border flex rotate-1 cursor-grabbing flex-col gap-3 rounded-lg border p-3 opacity-95 shadow-xl">
      <div className="flex items-start gap-2">
        <GripVertical
          size={13}
          className="text-muted-foreground mt-0.5 flex-shrink-0"
        />
        <p className="flex-1 text-sm leading-snug">{task.title}</p>
        <span
          className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${PRIORITY_COLOR[task.priority]}`}
        />
      </div>
      <div className="flex items-center justify-between pl-5">
        <span className="text-muted-foreground font-mono text-[11px]">
          {task.due}
        </span>
        <div
          className={`h-6 w-6 rounded-full ${task.assigneeColor} flex items-center justify-center text-[9px] font-medium text-white`}
        >
          {task.assignee}
        </div>
      </div>
    </div>
  );
}

// ── Board view ────────────────────────────────────────────────────────────────

function BoardView({
  tasks,
  onDragStart,
  onDragOver,
  onDragEnd,
  activeTask,
}: {
  tasks: Task[];
  onDragStart: (e: DragStartEvent) => void;
  onDragOver: (e: DragOverEvent) => void;
  onDragEnd: (e: DragEndEvent) => void;
  activeTask: Task | null;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const style = COLUMN_STYLES[col.id];

          return (
            <div key={col.id} className="flex flex-col gap-3">
              {/* Column header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                  <span className="text-xs font-medium">{col.label}</span>
                </div>
                <Badge
                  variant="secondary"
                  className={`px-1.5 py-0 text-[10px] ${style.badge}`}
                >
                  {colTasks.length}
                </Badge>
              </div>

              {/* Drop zone */}
              <SortableContext
                id={col.id}
                items={colTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div
                  className={cn(
                    "flex min-h-24 flex-col gap-2 rounded-xl p-2 transition-colors",
                    colTasks.length === 0 &&
                      "border-border border-2 border-dashed",
                  )}
                >
                  {colTasks.map((task) => (
                    <SortableTaskCard key={task.id} task={task} />
                  ))}
                </div>
              </SortableContext>

              {/* Add task */}
              <button className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 py-1 text-xs transition-colors">
                <Plus size={13} /> Add task
              </button>
            </div>
          );
        })}
      </div>

      {/* Ghost card while dragging */}
      <DragOverlay>
        {activeTask ? <DragOverlayCard task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// ── List view ─────────────────────────────────────────────────────────────────

function ListView({ tasks, filter }: { tasks: Task[]; filter: Filter }) {
  const visible = tasks.filter((t) => filter === "all" || t.status === filter);

  return (
    <div className="bg-card border-border divide-border divide-y overflow-hidden rounded-xl border">
      {visible.map((task) => (
        <div
          key={task.id}
          className={cn(
            "hover:bg-muted/50 flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors",
            task.status === "done" && "opacity-50",
          )}
        >
          {STATUS_ICON[task.status]}
          <span
            className={cn(
              "flex-1 text-sm",
              task.status === "done" && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </span>
          <span
            className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${PRIORITY_COLOR[task.priority]}`}
          />
          <span className="text-muted-foreground w-12 text-right font-mono text-xs tabular-nums">
            {task.due}
          </span>
          <div
            className={`h-6 w-6 rounded-full ${task.assigneeColor} flex flex-shrink-0 items-center justify-center text-[9px] font-medium text-white`}
          >
            {task.assignee}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TasksTab() {
  const [view, setView] = useState<View>("list");
  const [filter, setFilter] = useState<Filter>("all");
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const handleDragStart = (e: DragStartEvent) => {
    const task = tasks.find((t) => t.id === e.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;

    const activeId = active.id as number;
    const overId = over.id;

    // Dropped over a column id directly
    const overColumn = COLUMNS.find((c) => c.id === overId);
    if (overColumn) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, status: overColumn.id } : t,
        ),
      );
      return;
    }

    // Dropped over another task — inherit its column
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && overTask.status !== active.data.current?.status) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, status: overTask.status } : t,
        ),
      );
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as number;
    const overId = over.id;

    const overColumn = COLUMNS.find((c) => c.id === overId);
    if (overColumn) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, status: overColumn.id } : t,
        ),
      );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="bg-muted flex items-center gap-0.5 rounded-lg p-1">
            <button
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-all",
                view === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List size={13} /> List
            </button>
            <button
              onClick={() => setView("board")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-all",
                view === "board"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Columns size={13} /> Board
            </button>
          </div>

          {/* Filters — list view only */}
          {view === "list" && (
            <div className="flex items-center gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    filter === f.id
                      ? "bg-secondary text-foreground border-border"
                      : "text-muted-foreground hover:text-foreground border-transparent",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
          <Plus size={13} /> New task
        </Button>
      </div>

      {/* View */}
      {view === "list" ? (
        <ListView tasks={tasks} filter={filter} />
      ) : (
        <BoardView
          tasks={tasks}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          activeTask={activeTask}
        />
      )}
    </div>
  );
}
