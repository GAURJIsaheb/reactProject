//queue logic
import {
  addToQueue,
  upsertQueue,
  removeTaskUpdatesFromQueue,
  removeFromQueue
} from "@/lib/idb";

export async function queueCreate(
  task: any,
  userEmail: string,
  workspace: string,
  jobId?: string  
) {
  await addToQueue({
    id: jobId ?? crypto.randomUUID(), // ← bahar se aaye to use karo
    action: "create",
    taskId: task.id,
    userEmail,
    workspaceType: workspace,
    payload: task,
    retry: 0,
    nextRetry: Date.now()
  });
}

export async function queueUpdate(jobId: string, taskId: string, userEmail: string, payload: any) {
  await upsertQueue({
    id: jobId,
    action: "update",
    taskId,
    userEmail,
    payload,
    retry: 0,
    nextRetry: Date.now()
  });
}

export async function queueDelete(taskId: string, userEmail: string, workspace: string) {
  await removeTaskUpdatesFromQueue(taskId);

  await addToQueue({
    id: crypto.randomUUID(),
    action: "delete",
    taskId,
    userEmail,
    workspaceType: workspace,
    payload: {},
    retry: 0,
    nextRetry: Date.now()
  });
}

export async function removeQueueJob(jobId: string) {
  await removeFromQueue(jobId);
}