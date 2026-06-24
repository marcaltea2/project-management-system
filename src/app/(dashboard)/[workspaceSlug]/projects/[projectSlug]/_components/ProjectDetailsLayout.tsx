// ~/app/(dashboard)/[workspaceSlug]/projects/[projectSlug]/_components/project-details-client.tsx
"use client";

import { useState } from "react";
import { ProjectHeader } from "./ProjectHeader";
import { ProjectTabs } from "./ProjectTabs";
import { DetailsTab } from "./tabs/details/DetailsTab";
import { AttachmentsTab } from "./tabs/attachments/AttachmentsTab";
import { MembersTab } from "./tabs/members/MembersTab";
import { TasksTab } from "./tabs/tasks/TasksTab";
import type { ProjectData } from "~/types";
export type TabId = "details" | "attachments" | "members" | "tasks";

type Props = {
  project: ProjectData;
  initialStarred: boolean;
};

export function ProjectDetailsClient({ project, initialStarred }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("details");

  const renderTab = () => {
    switch (activeTab) {
case "details": return <DetailsTab project={project} />;
      case "attachments": return <AttachmentsTab projectId={project.id} />;
      case "members":     return <MembersTab projectId={project.id} />;
      case "tasks":       return <TasksTab projectId={project.id} />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ProjectHeader project={project} initialStarred={initialStarred} />
      <ProjectTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 p-6">{renderTab()}</div>
    </div>
  );
}