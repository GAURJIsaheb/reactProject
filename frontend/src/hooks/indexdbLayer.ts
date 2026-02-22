//index db logic
import {
  addTask,
  getAllTasks,
  getTaskById,
  deleteTaskFromIDB
} from "@/lib/idb";
import type { Task } from "@/types/task";

export async function loadLocalTasks(userEmail: string, workspace: string) {
  return await getAllTasks(userEmail, workspace);
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