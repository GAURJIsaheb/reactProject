import type { Task } from "./task";

export interface QueueJob {
  id: string;
  action: "create" | "update" | "delete" | "notification-delete";
  taskId: string;
  workspaceType?: string;
  payload?: Partial<Task>;  
  retry: number;
  nextRetry: number;
  userEmail: string;
}
