"use client";

// ===== React =====
import { useRouter } from "next/navigation";

// ===== Third Party =====
import { Calendar, FolderKanban, Link2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

// ===== Types =====
import type { Priority, ProjectStatus } from "@prisma/client";
import type { ProjectListItem } from "~/types";

// ===== Components =====
import { TaskProgress } from "./task-progress";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

// ===== Lib =====
import { cn } from "~/lib/utils";
import {
  PRIORITY_OPTIONS,
  PROJECT_STATUS_OPTIONS,
} from "~/lib/project-options";

type Props = {
  project: ProjectListItem;
  workspaceSlug: string;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
};

export function ProjectCard({
  project,
  workspaceSlug,
  onEdit,
  onDelete,
  onDuplicate,
}: Props) {
  const router = useRouter();

  const statusColor = (status: ProjectStatus) =>
    ({
      ACTIVE:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
      COMPLETED:
        "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
      ON_HOLD:
        "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
      ARCHIVED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    })[status];

  const priorityColor = (priority: Priority) =>
    ({
      LOW: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
      MEDIUM:
        "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
      HIGH: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
      URGENT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    })[priority];

  return (
    <Card
      key={project.id}
      className="group hover:border-border cursor-pointer overflow-hidden transition-colors"
      style={{
        borderTop: `5px solid ${project.coverColor ?? "#6366f1"}`,
      }}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pt-3 pb-2">
        <div className="flex items-center gap-2">
          {/* Icon with cover color tint */}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{
              backgroundColor: `${project.coverColor ?? "#6366f1"}20`,
            }}
          >
            <FolderKanban
              className="h-4 w-4"
              style={{ color: project.coverColor ?? "#6366f1" }}
            />
          </div>
          <div>
            <p
              className="text-sm leading-none font-medium"
              onClick={() =>
                router.push(`/${workspaceSlug}/projects/${project.slug}`)
              }
            >
              {project.name}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => (onEdit)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => (onDuplicate)}>
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => (onDelete)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        {project.description && (
          <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
            {project.description}
          </p>
        )}

        {/* Progress bar row */}
        <div className="pt-1 pb-0">
          <TaskProgress tasks={project.tasks} />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          {/* Status + Priority badges */}
          <div className="flex items-center gap-1.5">
            <Badge className={cn("text-[10px]", statusColor(project.status))}>
              {
                PROJECT_STATUS_OPTIONS.find((s) => s.value === project.status)
                  ?.label
              }
            </Badge>
            <Badge
              className={cn("text-[10px]", priorityColor(project.priority))}
            >
              {
                PRIORITY_OPTIONS.find((p) => p.value === project.priority)
                  ?.label
              }
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {/* Member avatars */}
            <div className="flex -space-x-1.5">
              {project.members?.slice(0, 3).map((member, i) => (
                <Avatar key={i} className="border-background h-5 w-5 border">
                  <AvatarImage src={member.user?.image ?? ""} />
                  <AvatarFallback className="text-[8px]">
                    {member.user?.name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>

            {/* Share button */}
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                void navigator.clipboard.writeText(
                  `${window.location.origin}/${project.slug}`,
                );
                toast.success("Link copied!");
              }}
            >
              <Link2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Due date */}
        {project.dueDate && (
          <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
            <Calendar className="h-3 w-3" />
            Due {new Date(project.dueDate).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
