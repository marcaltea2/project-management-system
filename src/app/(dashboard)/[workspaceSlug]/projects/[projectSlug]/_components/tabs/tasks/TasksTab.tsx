"use client";

import { useState, useCallback } from "react";
import { List, Columns } from "lucide-react";
import { cn } from "~/lib/utils";
import { CreateTaskButton } from "../../create-task-button";
import { CreateTaskDialog } from "../../create-task-dialog";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Skeleton } from "~/components/ui/skeleton";
import { BoardView } from "./task-board-view";
import { ListView } from "./task-list";
import { FILTERS } from "~/lib/constants/task-constants";
import type { Filter, View } from "~/lib/constants/task-constants";
import type { TaskListItem } from "~/types";
import type { TaskStatus } from "@prisma/client";
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";

type Props = { projectId: string };

export function TasksTab({ projectId }: Props) {
  const [view, setView] = useState<View>("list");
  const [filter, setFilter] = useState<Filter>("all");
  const [activeTask, setActiveTask] = useState<TaskListItem | null>(null);
  const [editingTask, setEditingTask] = useState<TaskListItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [optimisticTasks, setOptimisticTasks] = useState<TaskListItem[] | null>(null);

  const utils = api.useUtils();

  const { data: tasks = [], isLoading } = api.task.getAll.useQuery({ projectId });

  const displayTasks = optimisticTasks ?? tasks;

  const updateStatus = api.task.update.useMutation({
    onSuccess: (updatedTask) => {
      utils.task.getAll.setData({ projectId }, (prev) => {
        if (!prev) return prev;
        return prev.map((t) =>
          t.id === updatedTask.id ? { ...t, status: updatedTask.status } : t,
        );
      });
      void utils.project.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
      void utils.task.getAll.invalidate({ projectId });
      void utils.project.invalidate();
    },
    onSettled: () => setOptimisticTasks(null),
  });

  const deleteTask = api.task.delete.useMutation({
    onSuccess: () => {
      toast.success("Task deleted");
      void utils.task.getAll.invalidate({ projectId });
      void utils.project.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
      void utils.task.getAll.invalidate({ projectId });
      void utils.project.invalidate();
    },
  });

  const handleEdit = useCallback((task: TaskListItem) => {
    setEditingTask(task);
    setEditOpen(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => deleteTask.mutate({ id }),
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
    if (activeId === overId) return;

    const overColumn = FILTERS.find((c) => c.id === overId && c.id !== "all");
    const overTask = displayTasks.find((t) => t.id === overId);
    const targetStatus = (overColumn?.id ?? overTask?.status) as TaskStatus | undefined;

    if (!targetStatus) return;

    const draggingTask = displayTasks.find((t) => t.id === activeId);
    if (!draggingTask || draggingTask.status === targetStatus) return;

    setOptimisticTasks((prev) =>
      (prev ?? tasks).map((t) =>
        t.id === activeId ? { ...t, status: targetStatus } : t,
      ),
    );
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveTask(null);

    if (!over) { setOptimisticTasks(null); return; }

    const activeId = active.id as string;
    const overId = over.id as string;

    const overColumn = FILTERS.find((c) => c.id === overId && c.id !== "all");
    const overTask = displayTasks.find((t) => t.id === overId);
    const targetStatus = (overColumn?.id ?? overTask?.status) as TaskStatus | undefined;

    if (!targetStatus) { setOptimisticTasks(null); return; }

    const originalTask = tasks.find((t) => t.id === activeId);
    if (!originalTask || originalTask.status === targetStatus) {
      setOptimisticTasks(null);
      return;
    }

    window.dispatchEvent(new Event("project:saving"));
    
    updateStatus.mutate(
      {
        id: activeId,
        name: originalTask.name,
        description: originalTask.description ?? undefined,
        status: targetStatus,
        priority: originalTask.priority,
        dueDate: originalTask.dueDate ?? undefined,
      },
      { onSettled: () => setOptimisticTasks(null) },
    );
  };

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

        {view === "list" ? (
          <ListView tasks={displayTasks} filter={filter} onEdit={handleEdit} onDelete={handleDelete} />
        ) : (
          <BoardView
            tasks={displayTasks}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            activeTask={activeTask}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

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