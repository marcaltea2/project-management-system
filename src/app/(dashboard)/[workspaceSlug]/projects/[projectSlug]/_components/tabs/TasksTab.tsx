"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
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
  List,
  Columns,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { CreateTaskButton } from "../create-task-button";
import { CreateTaskDialog } from "../create-task-dialog";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import type { TaskListItem } from "~/types";
import type { Priority, TaskStatus } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type Filter = "all" | TaskStatus;
type View = "list" | "board";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  IN_REVIEW: <Clock size={15} className="flex-shrink-0 text-amber-500" />,
  TODO: <Circle size={15} className="text-muted-foreground flex-shrink-0" />,
  IN_PROGRESS: <Clock size={15} className="flex-shrink-0 text-blue-500" />,
  DONE: <CheckCircle2 size={15} className="flex-shrink-0 text-emerald-500" />,
};

const PRIORITY_DOT: Record<Priority, string> = {
  HIGH: "bg-red-500",
  URGENT: "bg-red-600",
  MEDIUM: "bg-amber-500",
  LOW: "bg-emerald-500",
};

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "TODO", label: "Todo" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "IN_REVIEW", label: "In Review" },
  { id: "DONE", label: "Done" },
];

const COLUMN_STYLES: Record<TaskStatus, { dot: string; badge: string }> = {
  TODO: { dot: "bg-muted-foreground", badge: "" },
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

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "TODO", label: "Todo" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "IN_REVIEW", label: "In Review" },
  { id: "DONE", label: "Done" },
];

// ── Sortable task card (board) ────────────────────────────────────────────────

function SortableTaskCard({
  task,
  onEdit,
  onDelete,
}: {
  task: TaskListItem;
  onEdit: (task: TaskListItem) => void;
  onDelete: (id: string) => void;
}) {
  
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { status: task.status } });

  const style = { transform: CSS.Transform.toString(transform), transition };

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
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground/40 hover:text-muted-foreground mt-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={13} />
        </button>
        <p className="flex-1 text-sm leading-snug">{task.name}</p>
        <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
        <TaskMenu task={task} onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="flex items-center justify-between pl-5">
        <span className="text-muted-foreground font-mono text-[11px]">
          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
        </span>
        <div className="flex -space-x-1.5">
          {task.members?.slice(0, 3).map((member, i) => (
            <Avatar key={i} className="border-background h-5 w-5 border">
              <AvatarImage src={member.user?.image ?? ""} />
              <AvatarFallback className="text-[8px]">
                {member.user?.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>
    </div>
  );
}

function DragOverlayCard({ task }: { task: TaskListItem }) {
  return (
    <div className="bg-card border-border flex rotate-1 cursor-grabbing flex-col gap-3 rounded-lg border p-3 opacity-95 shadow-xl">
      <div className="flex items-start gap-2">
        <GripVertical size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="flex-1 text-sm leading-snug">{task.name}</p>
        <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
      </div>
      <div className="flex items-center justify-between pl-5">
        <span className="text-muted-foreground font-mono text-[11px]">
          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
        </span>
        <div className="flex -space-x-1.5">
          {task.members?.slice(0, 3).map((member, i) => (
            <Avatar key={i} className="border-background h-5 w-5 border">
              <AvatarImage src={member.user?.image ?? ""} />
              <AvatarFallback className="text-[8px]">
                {member.user?.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Task context menu ─────────────────────────────────────────────────────────

function TaskMenu({
  task,
  onEdit,
  onDelete,
}: {
  task: TaskListItem;
  onEdit: (task: TaskListItem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 flex-shrink-0 opacity-0 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal size={13} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(task)}>
          <Pencil size={13} className="mr-2" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDelete(task.id)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 size={13} className="mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Board view ────────────────────────────────────────────────────────────────

function BoardView({
  tasks,
  onDragStart,
  onDragOver,
  onDragEnd,
  activeTask,
  onEdit,
  onDelete,
}: {
  tasks: TaskListItem[];
  onDragStart: (e: DragStartEvent) => void;
  onDragOver: (e: DragOverEvent) => void;
  onDragEnd: (e: DragEndEvent) => void;
  activeTask: TaskListItem | null;
  onEdit: (task: TaskListItem) => void;
  onDelete: (id: string) => void;
  projectId: string;
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
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const style = COLUMN_STYLES[col.id];

          return (
            <div key={col.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                  <span className="text-xs font-medium">{col.label}</span>
                </div>
                <Badge variant="secondary" className={`px-1.5 py-0 text-[10px] ${style.badge}`}>
                  {colTasks.length}
                </Badge>
              </div>

              <SortableContext
                id={col.id}
                items={colTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div
                  className={cn(
                    "flex min-h-24 flex-col gap-2 rounded-xl p-2 transition-colors",
                    colTasks.length === 0 && "border-border border-2 border-dashed",
                  )}
                >
                  {colTasks.map((task) => (
                    <SortableTaskCard
                      key={task.id}
                      task={task}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? <DragOverlayCard task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// ── List view ─────────────────────────────────────────────────────────────────

function ListView({
  tasks,
  filter,
  onEdit,
  onDelete,
}: {
  tasks: TaskListItem[];
  filter: Filter;
  onEdit: (task: TaskListItem) => void;
  onDelete: (id: string) => void;
}) {
  const visible = tasks.filter((t) => filter === "all" || t.status === filter);

  if (visible.length === 0) {
    return (
      <div className="border-border rounded-xl border-2 border-dashed py-16 text-center">
        <p className="text-muted-foreground text-sm">No tasks yet</p>
      </div>
    );
  }

  return (
    <div className="bg-card border-border divide-border divide-y overflow-hidden rounded-xl border">
      {visible.map((task) => (
        <div
          key={task.id}
          className={cn(
            "group hover:bg-muted/50 flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors",
            task.status === "DONE" && "opacity-50",
          )}
        >
          {STATUS_ICON[task.status]}
          <span
            className={cn(
              "flex-1 text-sm",
              task.status === "DONE" && "text-muted-foreground line-through",
            )}
          >
            {task.name}
          </span>
          <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
          <span className="text-muted-foreground w-20 text-right font-mono text-xs tabular-nums">
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
          </span>
          <div className="flex -space-x-1.5">
            {task.members?.slice(0, 3).map((member, i) => (
              <Avatar key={i} className="border-background h-6 w-6 border">
                <AvatarImage src={member.user?.image ?? ""} />
                <AvatarFallback className="text-[8px]">
                  {member.user?.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <TaskMenu task={task} onEdit={onEdit} onDelete={onDelete} />
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  projectId: string;
};

export function TasksTab({ projectId }: Props) {
  const [view, setView] = useState<View>("list");
  const [filter, setFilter] = useState<Filter>("all");
  const [activeTask, setActiveTask] = useState<TaskListItem | null>(null);
  const [editingTask, setEditingTask] = useState<TaskListItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const utils = api.useUtils();

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const { data: tasks = [], isLoading } = api.task.getAll.useQuery({
    projectId,
  });

  console.log("TASKS: ",tasks);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateStatus = api.task.update.useMutation({
    onSuccess: () => utils.task.getAll.invalidate({ projectId }),
    onError: (err) => {
      toast.error(err.message);
      void utils.task.getAll.invalidate({ projectId });
    },
  });

  const deleteTask = api.task.delete.useMutation({
    onSuccess: () => {
      toast.success("Task deleted");
      void utils.task.getAll.invalidate({ projectId });
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Optimistic tasks state for DnD ────────────────────────────────────────

  const [optimisticTasks, setOptimisticTasks] = useState<TaskListItem[] | null>(null);
  const displayTasks = optimisticTasks ?? tasks;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleEdit = useCallback((task: TaskListItem) => {
    setEditingTask(task);
    setEditOpen(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      deleteTask.mutate({ id });
    },
    [deleteTask],
  );

  const handleDragStart = (e: DragStartEvent) => {
    const task = displayTasks.find((t) => t.id === e.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const overColumn = COLUMNS.find((c) => c.id === overId);
    const targetStatus: TaskStatus | undefined =
      overColumn?.id ?? displayTasks.find((t) => t.id === overId)?.status;

    if (!targetStatus) return;

    setOptimisticTasks((prev) =>
      (prev ?? tasks).map((t) =>
        t.id === activeId ? { ...t, status: targetStatus } : t,
      ),
    );
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveTask(null);

    if (!over) {
      setOptimisticTasks(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const overColumn = COLUMNS.find((c) => c.id === overId);
    const targetStatus: TaskStatus | undefined =
      overColumn?.id ?? displayTasks.find((t) => t.id === overId)?.status;

    if (!targetStatus) {
      setOptimisticTasks(null);
      return;
    }

    const originalTask = tasks.find((t) => t.id === activeId);
    if (!originalTask || originalTask.status === targetStatus) {
      setOptimisticTasks(null);
      return;
    }

    // Persist optimistic state then fire mutation
    updateStatus.mutate(
      {
        id: activeId,
        name: originalTask.name,
        description: originalTask.description ?? undefined,
        status: targetStatus,
        priority: originalTask.priority,
        dueDate: originalTask.dueDate ?? undefined,
      },
      {
        onSettled: () => setOptimisticTasks(null),
      },
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <>
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

          <CreateTaskButton projectId={projectId} />
        </div>

        {/* View */}
        {view === "list" ? (
          <ListView
            tasks={displayTasks}
            filter={filter}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : (
          <BoardView
            tasks={displayTasks}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            activeTask={activeTask}
            onEdit={handleEdit}
            onDelete={handleDelete}
            projectId={projectId}
          />
        )}
      </div>

      {/* Edit dialog */}
      <CreateTaskDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingTask(null);
        }}
        projectId={projectId}
        task={editingTask}
      />
    </>
  );
}