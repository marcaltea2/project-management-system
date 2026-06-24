"use client";

import { Circle, Clock, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";
import { TaskMenu } from "./task-card";
import { PRIORITY_DOT } from "~/lib/constants/task-constants";
import type { TaskListItem } from "~/types";
import type { TaskStatus } from "@prisma/client";

type Filter = "all" | TaskStatus;

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  IN_REVIEW: <Clock size={15} className="flex-shrink-0 text-amber-500" />,
  TODO: <Circle size={15} className="text-muted-foreground flex-shrink-0" />,
  IN_PROGRESS: <Clock size={15} className="flex-shrink-0 text-blue-500" />,
  DONE: <CheckCircle2 size={15} className="flex-shrink-0 text-emerald-500" />,
};

export function ListView({
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