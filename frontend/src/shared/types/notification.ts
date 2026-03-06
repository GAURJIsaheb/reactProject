export interface AppNotification {
  id: string;
  kind: "task_completed";
  taskId: string;
  taskText: string;
  userEmail: string;
  workspaceType: string;
  read: boolean;
  deleted: boolean;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
  syncStatus: "synced" | "pending";
}
