export interface QueueJob {
  id: string;
  action: "create" | "update" | "delete";
  taskId: string;
  userEmail: string;
  workspaceType?: string;
  payload: any;
  retry: number;
  nextRetry: number;
}
