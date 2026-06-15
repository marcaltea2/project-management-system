import type { RouterOutputs } from "~/trpc/react";

export type ProjectData = NonNullable<RouterOutputs["project"]["getProject"]>;
export type ProjectListItem = RouterOutputs["project"]["getAll"][number];
export type ProjectById = NonNullable<RouterOutputs["project"]["getById"]>;
export type ProjectMembers = RouterOutputs["project"]["getMembers"][number];

export type ProjectMemberData = ProjectData["members"][number];
export type ProjectMemberUser = NonNullable<ProjectMemberData["user"]>;
export type ProjectAttachmentData = ProjectData["attachments"][number];
export type ProjectWorkspace = ProjectData["workspace"];


export type SelectedMember = {
  id: string;
  name: string | null;
  image: string | null;
  email: string | null;
};
