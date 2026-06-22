"use client";

// ===== React =====
import { useState } from "react";
import { useParams } from "next/navigation";

// ===== API =====
import { api } from "~/trpc/react";

// ===== Third-party =====
import { toast } from "sonner";

// ===== UI Components =====
import { CreateProjectDialog } from "./create-project-dialog";
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

import { ProjectSkeleton } from "./project-skeleton";
import { ProjectEmpty } from "./project-empty";
import { ProjectCard } from "./project-card";

// ===== Lib =====
import { toSlug } from "~/lib/to-slug";
import type { ProjectListItem } from "~/types";

type Props = {
  workspaceId: string;
};

export function ProjectList({ workspaceId }: Props) {
  const utils = api.useUtils();
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

  if (isLoading) {
    return <ProjectSkeleton />;
  }

  if (!projects?.length) {
    return <ProjectEmpty />;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            workspaceSlug={workspaceSlug}
            onEdit={() => setEditProject(project)}
            onDelete={() => setDeleteProjectId(project.id)}
            onDuplicate={() => handleDuplicate(project)}
          />
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
