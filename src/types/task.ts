import type { RouterOutputs } from "~/trpc/react";

export type TaskListItem = RouterOutputs["task"]["getAll"][number];

export type TaskMemberData = TaskListItem["members"][number];
export type TaskMemberUser = NonNullable<TaskMemberData["user"]>;
export type TaskAttachmentData = TaskListItem["attachments"][number];

