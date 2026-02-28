import {
  addToQueue,
  upsertQueue,
  removeTaskUpdatesFromQueue,
  removeFromQueue,
} from "@/infrastructure/lib/idb";

export async function queueCreate(
  task: any,
  userEmail: string,
  workspace: string,
  jobId?: string
) {
  const id = jobId ?? crypto.randomUUID();
  await addToQueue({
    id,
    action: "create",
    taskId: task.id,
    userEmail,
    workspaceType: workspace,
    payload: task,
    retry: 0,
    nextRetry: Date.now(),
  });
  return id;
}

export async function queueUpdate(
  jobId: string,
  taskId: string,
  userEmail: string,
  payload: any
) {
  await upsertQueue({
    id: jobId,
    action: "update",
    taskId,
    userEmail,
    payload,
    retry: 0,
    nextRetry: Date.now(),
  });
  return jobId;
}

/**
 * Returns the jobId so the caller can remove it from the queue
 * after a successful API call — previously this was a fire-and-forget
 * with no way to clean up on success.
 */
export async function queueDelete(
  taskId: string,
  userEmail: string,
  workspace: string
): Promise<string> {
  // Cancel any pending create/update jobs for this task — no point
  // syncing changes for something we're about to delete.
  await removeTaskUpdatesFromQueue(taskId);

  const jobId = crypto.randomUUID();
  await addToQueue({
    id: jobId,
    action: "delete",
    taskId,
    userEmail,
    workspaceType: workspace,
    payload: {},
    retry: 0,
    nextRetry: Date.now(),
  });

  return jobId;
}

export async function removeQueueJob(jobId: string) {
  await removeFromQueue(jobId);
}