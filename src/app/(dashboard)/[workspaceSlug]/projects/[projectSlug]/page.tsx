// page.tsx — server component, no extra layout wrapper needed
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { redirect } from "next/navigation";
import { api } from "~/trpc/server";
import { ProjectDetailsClient } from "./_components/ProjectDetailsLayout";

type Props = {
  params: Promise<{ workspaceSlug: string; projectSlug: string }>;
};

export default async function ProjectPage({ params }: Props) {
  const { workspaceSlug, projectSlug } = await params;

  const session = await auth();
  if (!session) redirect("/login");

  const project = await api.project.getProject({ workspaceSlug, projectSlug });
  if (!project) redirect(`/${workspaceSlug}/projects`);

  const starredProject = await db.starredProject.findFirst({
    where: { projectId: project.id, userId: session.user.id },
  });

  return (
    <ProjectDetailsClient
      project={project}
      initialStarred={!!starredProject}
    />
  );
}