export type ActivityLogUser = {
  id: string;
  name: string | null;
  image: string | null;
};

export type ActivityLog = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  userId: string;
  projectId: string | null;
  user: ActivityLogUser;
};