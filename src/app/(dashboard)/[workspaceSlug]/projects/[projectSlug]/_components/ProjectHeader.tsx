"use client";

import {
  ChevronRight,
  MoreHorizontal,
  Star,
  Share2,
  Clock,
  Plus,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import type { ProjectData } from "~/types";

import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "~/lib/project-options";

import { formatDistanceToNow } from "date-fns";

export function ProjectHeader({ project }: { project: ProjectData }) {
  const visibleMembers = project.members?.slice(0, 3) ?? [];
  const remainingCount = Math.max(
    (project.members?.length ?? 0) - visibleMembers.length,
    0,
  );

  return (
    <div className="border-border bg-background border-b px-6 pt-5 pb-0">
      {/* Breadcrumb */}
      <div className="text-muted-foreground mb-4 flex items-center gap-1 font-mono text-xs">
        <span className="hover:text-foreground cursor-pointer transition-colors">
          {project.workspace.slug}
        </span>
        <ChevronRight size={12} />
        <span className="hover:text-foreground cursor-pointer transition-colors">
          Projects
        </span>
        <ChevronRight size={12} />
        <span className="text-foreground">{project.slug}</span>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted border-border flex h-10 w-10 items-center justify-center rounded-lg border text-xl">
            🚀
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-base font-medium capitalize">{project.name}</h1>
            <div className="flex items-center gap-1.5">
              <Badge
                variant="secondary"
                className="border-emerald-200 bg-emerald-50 px-2 py-0 text-[10px] text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
              >
                {STATUS_OPTIONS.find((s) => s.value === project.status)
                  ?.label ?? project.status}
              </Badge>
              <Badge variant="secondary" className="px-2 py-0 text-[10px]">
                {PRIORITY_OPTIONS.find((p) => p.value === project.priority)
                  ?.label ?? project.priority}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Last updated */}
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Clock size={12} />
            {formatDistanceToNow(
              new Date(project.updatedAt ?? project.createdAt),
              { addSuffix: true },
            )}
          </span>

          {/* Avatars */}
          <TooltipProvider>
            <div className="flex -space-x-2">
              {visibleMembers.map((member) => (
                <Tooltip key={member.id}>
                  <TooltipTrigger asChild>
                    <Avatar className="border-background h-7 w-7 border">
                      <AvatarImage src={member.user?.image ?? ""} />
                      <AvatarFallback className="text-[8px]">
                        {member.user?.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>

                  <TooltipContent>
                    <p>{member.user?.name}</p>
                  </TooltipContent>
                </Tooltip>
              ))}

              {remainingCount > 0 && (
                <Avatar className="border-background h-7 w-7 border">
                  <AvatarFallback className="text-[8px]">
                    +{remainingCount}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </TooltipProvider>

          {/* Invite */}
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
            <Plus size={13} />
            Invite
          </Button>

          {/* Actions */}
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <Star size={14} />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <Share2 size={14} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <MoreHorizontal size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit project</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
