"use client";

import { GripVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";
import { PRIORITY_DOT } from "~/lib/constants/task-constants";
import type { TaskListItem } from "~/types";

// ── Task menu ─────────────────────────────────────────────────────────────────

export function TaskMenu({
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

// ── Member avatars (shared between card variants) ─────────────────────────────

function MemberAvatars({ members }: { members: TaskListItem["members"] }) {
  return (
    <div className="flex -space-x-1.5">
      {members?.slice(0, 3).map((member, i) => (
        <Avatar key={i} className="border-background h-5 w-5 border">
          <AvatarImage src={member.user?.image ?? ""} />
          <AvatarFallback className="text-[8px]">
            {member.user?.name?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
    </div>
  );
}

// ── Sortable task card ────────────────────────────────────────────────────────

export function SortableTaskCard({
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
        <MemberAvatars members={task.members} />
      </div>
    </div>
  );
}

// ── Drag overlay card ─────────────────────────────────────────────────────────

export function DragOverlayCard({ task }: { task: TaskListItem }) {
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
        <MemberAvatars members={task.members} />
      </div>
    </div>
  );
}