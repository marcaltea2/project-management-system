"use client";

import { useState } from "react";
import { ProjectHeader } from "./ProjectHeader";
import { ProjectTabs } from "./ProjectTabs";
import { DetailsTab } from "./tabs/DetailsTab";
import { AttachmentsTab } from "./tabs/AttachmentsTab";
import { MembersTab } from "./tabs/MembersTab";
import { TasksTab } from "./tabs/TasksTab";
import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";

export type TabId = "details" | "attachments" | "members" | "invite" | "tasks";

type ProjectDetailsLayoutProps = {
  workspaceSlug: string;
  projectSlug: string;
};

export function ProjectDetailsLayout({ workspaceSlug, projectSlug }: ProjectDetailsLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabId>("details");
    const { data: project, isLoading } = api.project.getProject.useQuery({
    workspaceSlug,
    projectSlug,
  });

  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }
  
  if (!project) return <div>Project not found</div>;

  const renderTab = () => {
    switch (activeTab) {
      case "details":     return <DetailsTab project={project} />;
      case "attachments": return <AttachmentsTab attachments={project.attachments} />;
      case "members":     return <MembersTab members={project.members} />;
      case "tasks":       return <TasksTab />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <ProjectHeader project={project} />
      <ProjectTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 p-6">{renderTab()}</div>
    </div>
  );
}