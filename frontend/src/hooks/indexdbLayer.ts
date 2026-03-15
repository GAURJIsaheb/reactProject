//index db logic
import {
  addTask,
  getAllTasks,
  getTaskById,
  deleteTaskFromIDB
} from "@/infrastructure/indexDb/idb";
import type { Task } from "@/shared/types/task";

export async function loadLocalTasks(userEmail: string, workspace: string) {
  return await getAllTasks(userEmail, workspace);
}

export async function loadWorkspaceTasks(
  userEmail: string,
  workspace: string,
  workspaceId?: string | null
) {
  return await getAllTasks(userEmail, workspace, workspaceId);
}

export async function getLocalTask(id: string) {
  return await getTaskById(id);
}

export async function saveLocalTask(task: Task) {
  await addTask(task);
}

export async function deleteLocalTask(id: string) {
  await deleteTaskFromIDB(id);
}
