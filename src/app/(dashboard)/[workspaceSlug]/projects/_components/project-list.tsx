"use client";

// ===== React =====
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

// ===== API =====
import { api } from "~/trpc/react";

// ===== Third-party =====
import { toast } from "sonner";
import { FolderKanban, MoreHorizontal, Calendar, Link2 } from "lucide-react";

// ===== UI Components =====
import { CreateProjectDialog } from "./create-project-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Separator } from "~/components/ui/separator";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Skeleton } from "~/components/ui/skeleton";

// ===== Lib =====
import { toSlug } from "~/lib/to-slug";
import type { ProjectStatus, Priority } from "@prisma/client";
import {
  PROJECT_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from "~/lib/project-options";
import type { ProjectListItem } from "~/types";
import { cn } from "~/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

// ─── TaskProgress ─────────────────────────────────────────────────────────────

function TaskProgress({ tasks }: { tasks: ProjectListItem["tasks"] }) {
  const total = tasks?.length ?? 0;
  const done = tasks?.filter((t) => t.status === "DONE").length ?? 0;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  if (total === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex cursor-default items-center gap-2">
            <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  pct === 100
                    ? "bg-emerald-500"
                    : pct >= 60
                      ? "bg-blue-500"
                      : "bg-amber-400",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-muted-foreground text-[11px] tabular-nums">
              {done}/{total}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">
            {pct}% complete · {total - done} remaining
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

type Props = {
  workspaceId: string;
};

export function ProjectList({ workspaceId }: Props) {
  const utils = api.useUtils();
  const router = useRouter();
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const [editProject, setEditProject] = useState<ProjectListItem | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);

  const { data: projects, isLoading } = api.project.getAll.useQuery({
    workspaceId,
  });

  const deleteProject = api.project.delete.useMutation({
    onSuccess: async () => {
      await utils.project.invalidate();
      toast.success("Project deleted.");
      setDeleteProjectId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const duplicateProject = api.project.create.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const copyAttachments = api.attachments.Duplicate.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const handleDuplicate = async (project: ProjectListItem) => {
    try {
      // 1. Create duplicate project
      const duplicated = await duplicateProject.mutateAsync({
        workspaceId,
        name: `${project.name} (copy)`,
        slug: toSlug(`${project.name} copy`),
        description: project.description ?? undefined,
        status: project.status,
        priority: project.priority,
        dueDate: project.dueDate ?? undefined,
        coverColor: project.coverColor ?? undefined,
        members: project.members?.map((m) => m.userId) ?? [],
      });

      // 2. Copy attachments to new R2 files
      if (project.attachments?.length) {
        await copyAttachments.mutateAsync({
          projectId: duplicated.id,
          attachments: project.attachments.map((a) => ({
            filename: a.filename,
            url: a.url,
            mimeType: a.mimeType,
            size: a.size,
          })),
        });
      }

      await utils.project.invalidate();
      toast.success("Project duplicated.");
    } catch (err) {
      toast.error("Failed to duplicate project.");
      console.error(err);
    }
  };

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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!projects?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-full">
          <FolderKanban className="text-muted-foreground h-7 w-7" />
        </div>
        <div className="text-center">
          <p className="font-medium">No projects yet</p>
          <p className="text-muted-foreground text-sm">
            Create your first project to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
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
                  {/* <p className="text-muted-foreground mt-0.5 text-xs">
                    /{project.slug}
                  </p> */}
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
                  <DropdownMenuItem onClick={() => setEditProject(project)}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicate(project)}>
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDeleteProjectId(project.id)}
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
                  <Badge
                    className={cn("text-[10px]", statusColor(project.status))}
                  >
                    {
                      PROJECT_STATUS_OPTIONS.find(
                        (s) => s.value === project.status,
                      )?.label
                    }
                  </Badge>
                  <Badge
                    className={cn(
                      "text-[10px]",
                      priorityColor(project.priority),
                    )}
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
                      <Avatar
                        key={i}
                        className="border-background h-5 w-5 border"
                      >
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
        ))}
      </div>

      {/* Edit Dialog — reuses CreateProjectDialog */}
      <CreateProjectDialog
        open={!!editProject}
        onOpenChange={(open) => !open && setEditProject(null)}
        workspaceId={workspaceId}
        project={editProject}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteProjectId}
        onOpenChange={(open) => !open && setDeleteProjectId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all its tasks. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteProjectId && deleteProject.mutate({ id: deleteProjectId })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
