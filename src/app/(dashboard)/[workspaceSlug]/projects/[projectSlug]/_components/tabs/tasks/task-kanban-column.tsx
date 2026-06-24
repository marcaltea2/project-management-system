"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { SortableTaskCard } from "./task-card";
import { COLUMN_STYLES } from "~/lib/constants/task-constants";
import type { TaskListItem } from "~/types";
import type { TaskStatus } from "@prisma/client";

export function KanbanColumn({
  col,
  tasks,
  onEdit,
  onDelete,
}: {
  col: { id: TaskStatus; label: string };
  tasks: TaskListItem[];
  onEdit: (task: TaskListItem) => void;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const style = COLUMN_STYLES[col.id];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${style.dot}`} />
          <span className="text-xs font-medium">{col.label}</span>
        </div>
        <Badge variant="secondary" className={`px-1.5 py-0 text-[10px] ${style.badge}`}>
          {tasks.length}
        </Badge>
      </div>

      <SortableContext
        id={col.id}
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            "flex min-h-24 flex-col gap-2 rounded-xl p-2 transition-all duration-150",
            tasks.length === 0 && "border-border border-2 border-dashed",
            isOver && "bg-muted/60 border-primary/40 scale-[1.01] border-2 border-dashed",
          )}
        >
          {tasks.map((task) => (
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
}