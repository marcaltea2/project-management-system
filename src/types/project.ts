import type { RouterOutputs } from "~/trpc/react";

export type ProjectData = NonNullable<RouterOutputs["project"]["getProject"]>;
export type ProjectListItem = RouterOutputs["project"]["getAll"][number];
export type ProjectMembers = RouterOutputs["project"]["getMembers"][number];
export type ProjectAttachments = RouterOutputs["project"]["getAttachments"][number];

export type ProjectMemberUser = NonNullable<ProjectMembers["user"]>;
export type ProjectWorkspace = ProjectData["workspace"];


export type SelectedMember = {
  id: string;
  name: string | null;
  image: string | null;
  email: string | null;
};
