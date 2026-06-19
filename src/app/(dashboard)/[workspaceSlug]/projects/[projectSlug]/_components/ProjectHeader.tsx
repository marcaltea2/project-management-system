// ~/app/(dashboard)/[workspaceSlug]/projects/[projectSlug]/_components/project-header.tsx
"use client";

import {
  ChevronRight,
  MoreHorizontal,
  Star,
  Clock,
  Plus,
  Check,
  Loader2,
  UserPlus,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { cn } from "~/lib/utils";
import type { ProjectData } from "~/types";
import { PROJECT_STATUS_OPTIONS, PRIORITY_OPTIONS } from "~/lib/project-options";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect, useCallback } from "react";
import { api } from "~/trpc/react";
import { InviteMemberDialog } from "./invite-member-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "saved";

type Props = {
  project: ProjectData;
  /** Initial starred state — derive this server-side before passing down */
  initialStarred?: boolean;
};

// ─── SaveIndicator ────────────────────────────────────────────────────────────

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-[11px] transition-all duration-300",
        status === "saving" && "text-muted-foreground",
        status === "saved" && "text-emerald-600 dark:text-emerald-400",
      )}
    >
      {status === "saving" ? (
        <Loader2 size={10} className="animate-spin" />
      ) : (
        <Check size={10} />
      )}
      {status === "saving" ? "Saving…" : "Saved"}
    </span>
  );
}

// ─── ProjectHeader ────────────────────────────────────────────────────────────

export function ProjectHeader({ project, initialStarred = false }: Props) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isStarred, setIsStarred] = useState(initialStarred);
  const [inviteOpen, setInviteOpen] = useState(false);

  // ── Last activity: poll the server for task-aware timestamp ──────────────
  const { data: activityData } = api.project.getLastActivity.useQuery(
    { projectId: project.id },
    {
      refetchInterval: 30_000, // refresh every 30s
      initialData: {
        lastActivityAt: new Date(project.updatedAt ?? project.createdAt),
      },
    },
  );
  const activityDate = new Date(activityData.lastActivityAt);

  // ── Star toggle ──────────────────────────────────────────────────────────
  const toggleStar = api.project.toggleStar.useMutation({
    onMutate: () => setIsStarred((v) => !v), // optimistic
    onError: () => setIsStarred((v) => !v),  // rollback
  });

  // ── Auto-save indicator ──────────────────────────────────────────────────
  const triggerSave = useCallback(() => {
    setSaveStatus("saving");
    const t1 = setTimeout(() => setSaveStatus("saved"), 1200);
    const t2 = setTimeout(() => setSaveStatus("idle"), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    // Any child mutation dispatches: window.dispatchEvent(new Event("project:saving"))
    window.addEventListener("project:saving", triggerSave);
    return () => window.removeEventListener("project:saving", triggerSave);
  }, [triggerSave]);

  const visibleMembers = project.members?.slice(0, 4) ?? [];
  const remainingCount = Math.max(
    (project.members?.length ?? 0) - visibleMembers.length,
    0,
  );

  const statusOption = PROJECT_STATUS_OPTIONS.find(
    (s) => s.value === project.status,
  );
  const priorityOption = PRIORITY_OPTIONS.find(
    (p) => p.value === project.priority,
  );

  return (
    <>
      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        projectId={project.id}
        workspaceId={project.workspaceId}
        existingMemberIds={project.members?.map((m) => m.userId) ?? []}
      />

      <div className="border-border bg-background border-b px-6 pt-5 pb-0">
        {/* Breadcrumb */}
        <nav className="text-muted-foreground mb-3 flex items-center gap-1 font-mono text-[11px]">
          <span className="hover:text-foreground cursor-pointer transition-colors">
            {project.workspace.slug}
          </span>
          <ChevronRight size={11} />
          <span className="hover:text-foreground cursor-pointer transition-colors">
            Projects
          </span>
          <ChevronRight size={11} />
          <span className="text-foreground font-medium">{project.slug}</span>
        </nav>

        {/* Header row */}
        <div className="flex items-start justify-between pb-3">
          {/* Left */}
          <div className="flex items-center gap-3">
            <div className="bg-muted border-border flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg">
              🚀
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold capitalize leading-none">
                  {project.name}
                </h1>
                <SaveIndicator status={saveStatus} />
              </div>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className="border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[10px] leading-5 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                >
                  {statusOption?.label ?? project.status}
                </Badge>
                <Badge
                  variant="secondary"
                  className="px-1.5 py-0 text-[10px] leading-5"
                >
                  {priorityOption?.label ?? project.priority}
                </Badge>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
              <Clock size={11} />
              {formatDistanceToNow(activityDate, { addSuffix: true })}
            </span>

            <div className="bg-border mx-1 h-4 w-px" />

            {/* Avatars + invite */}
            <TooltipProvider>
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {visibleMembers.map((member) => (
                    <Tooltip key={member.id}>
                      <TooltipTrigger asChild>
                        <Avatar className="border-background h-6 w-6 border-2 transition-transform hover:z-10 hover:scale-110">
                          <AvatarImage src={member.user?.image ?? ""} />
                          <AvatarFallback className="text-[9px]">
                            {member.user?.name?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs">{member.user?.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {remainingCount > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="border-background h-6 w-6 border-2">
                          <AvatarFallback className="text-[9px]">
                            +{remainingCount}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs">{remainingCount} more members</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="ml-1 h-6 w-6 rounded-full border border-dashed"
                      onClick={() => setInviteOpen(true)}
                    >
                      <Plus size={11} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Invite member</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            <div className="bg-border mx-1 h-4 w-px" />

            {/* Star */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-7 w-7",
                      isStarred && "text-amber-500 hover:text-amber-600",
                    )}
                    onClick={() => toggleStar.mutate({ projectId: project.id })}
                  >
                    {isStarred ? (
                      <Star size={14} fill="currentColor" />
                    ) : (
                      <Star size={14} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">
                    {isStarred ? "Unstar" : "Star project"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* More */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7">
                  <MoreHorizontal size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => setInviteOpen(true)}>
                  <UserPlus size={13} className="mr-2" />
                  Invite member
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Edit project</DropdownMenuItem>
                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  Delete project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </>
  );
}