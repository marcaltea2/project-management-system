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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { toSlug } from "~/lib/to-slug";
import type { ProjectData } from "~/types";
import { PROJECT_STATUS_OPTIONS, PRIORITY_OPTIONS } from "~/lib/constants/project-constants";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { InviteMemberDialog } from "./invite-member-dialog";
import type { ProjectStatus, Priority } from "@prisma/client";

type SaveStatus = "idle" | "saving" | "saved";

type Props = {
  project: ProjectData;
  initialStarred?: boolean;
};

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

export function ProjectHeader({ project, initialStarred = false }: Props) {
  const [name, setName] = useState(project.name);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [priority, setPriority] = useState<Priority>(project.priority);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isStarred, setIsStarred] = useState(initialStarred);
  const [inviteOpen, setInviteOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utils = api.useUtils();

  // ── Last activity ────────────────────────────────────────────────────────
  const { data: activityData } = api.project.getLastActivity.useQuery(
    { projectId: project.id },
    {
      refetchInterval: 30_000,
      initialData: {
        lastActivityAt: new Date(project.updatedAt ?? project.createdAt),
      },
    },
  );
  const activityDate = new Date(activityData.lastActivityAt);

  // ── Update mutation ──────────────────────────────────────────────────────
  const update = api.project.update.useMutation({
    onMutate: () => {
      setSaveStatus("saving");
      window.dispatchEvent(new Event("project:saving"));
    },
    onSuccess: () => {
      setSaveStatus("saved");
      void utils.project.getProject.invalidate();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2500);
    },
    onError: (err) => {
      setSaveStatus("idle");
      toast.error(err.message ?? "Failed to save");
    },
  });

  const scheduleSave = useCallback(
    (patch: { name?: string; status?: ProjectStatus; priority?: Priority }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        update.mutate({
          id: project.id,
          name: patch.name ?? name,
          slug: toSlug(patch.name ?? name),
          status: patch.status ?? status,
          priority: patch.priority ?? priority,
        });
      }, 800);
    },
    [update, project.id, name, status, priority],
  );

  const saveNow = useCallback(
    (patch: { status?: ProjectStatus; priority?: Priority }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      update.mutate({
        id: project.id,
        name,
        slug: toSlug(name),
        status: patch.status ?? status,
        priority: patch.priority ?? priority,
      });
    },
    [update, project.id, name, status, priority],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // ── Star toggle ──────────────────────────────────────────────────────────
  const toggleStar = api.project.toggleStar.useMutation({
    onMutate: () => setIsStarred((v) => !v),
    onError: () => setIsStarred((v) => !v),
  });

  // ── Auto-save listener for child mutations ───────────────────────────────
  const triggerSave = useCallback(() => {
    setSaveStatus("saving");
    const t1 = setTimeout(() => setSaveStatus("saved"), 1200);
    const t2 = setTimeout(() => setSaveStatus("idle"), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    window.addEventListener("project:saving", triggerSave);
    return () => window.removeEventListener("project:saving", triggerSave);
  }, [triggerSave]);

  const visibleMembers = project.members?.slice(0, 4) ?? [];
  const remainingCount = Math.max(
    (project.members?.length ?? 0) - visibleMembers.length,
    0,
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
        <div className="flex items-center justify-between pb-4">
          {/* Left — name + badges */}
          <div className="flex min-w-0 flex-1 items-center gap-3 pr-4">
            <div className="bg-muted border-border flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg">
              🚀
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    scheduleSave({ name: e.target.value });
                  }}
                  onBlur={() => {
                    if (!name.trim()) setName(project.name);
                  }}
                  placeholder="Project name"
                  className={cn(
                    "text-foreground w-full bg-transparent text-sm font-semibold leading-none outline-none",
                    "-ml-1.5 rounded px-1.5 py-0.5 transition-colors",
                    "hover:bg-muted focus:bg-muted",
                  )}
                />
                <SaveIndicator status={saveStatus} />
              </div>

              <div className="flex items-center gap-1.5">
                <Select
                  value={status}
                  onValueChange={(v) => {
                    const val = v as ProjectStatus;
                    setStatus(val);
                    saveNow({ status: val });
                  }}
                >
                  <SelectTrigger className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 h-5 gap-1 border px-1.5 text-[10px] font-medium shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={priority}
                  onValueChange={(v) => {
                    const val = v as Priority;
                    setPriority(val);
                    saveNow({ priority: val });
                  }}
                >
                  <SelectTrigger className="h-5 gap-1 border px-1.5 text-[10px] font-medium shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value} className="text-xs">
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Right — actions */}
          <div className="flex shrink-0 items-center gap-2">
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
                    <p className="text-xs">Add member</p>
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
                  <p className="text-xs">{isStarred ? "Unstar" : "Star project"}</p>
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
                  Add member
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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