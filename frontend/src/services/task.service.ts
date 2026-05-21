import { authHeaders } from "@/services/auth.service";
import { addTask, pruneSyncedTasksMissingOnServer } from "@/infrastructure/lib/idb";
import type { Task } from "@/shared/types/task";
import { normalizeSubtasks } from "@/shared/lib/subtasks";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

function getErrorMessage(data: { error?: string; message?: string } | null | undefined, fallback: string) {
  return data?.error || data?.message || fallback;
}

// For routes that may have an image - use FormData
function buildFormData(data: Record<string, any>, imageFile?: File | null): FormData {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, String(v));
  });
  if (imageFile) fd.append("image", imageFile);
  return fd;
}

// Auth headers without Content-Type (browser sets it with boundary for: FormData is not json)
function authHeadersNoContentType(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchFromServer(
  userEmail: string,
  workspace: string,
  token: string
) {
  if (!userEmail || !token) return;

  try {
    const res = await fetch(`${API_BASE}/tasks?workspaceType=${workspace}`, {
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error("fetch failed");

    const serverTasks = await res.json();
    console.log("SERVER -> LOCAL SYNC:", serverTasks.length);
    const serverIds: string[] = [];

    for (const t of serverTasks) {
      const id = t.taskId ?? t.id;
      if (!id) continue;
      serverIds.push(id);

      await addTask({
        id,
        text: t.text,
        labels: t.labels ?? [],
        subtasks: normalizeSubtasks(t.subtasks),
        image: t.imageUrl ?? t.image ?? null, // signed URL if cached, otherwise S3 key
        imageUrl: t.imageUrl ?? null,
        imageUrlExpiry: t.imageUrlExpiry ?? null,
        reminderAt: t.reminderAt ?? null,
        completed: t.completed,
        archived: t.archived,
        deleted: t.deleted,
        deletedAt: t.deletedAt ?? null,
        sectionId: t.sectionId ?? null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        workspaceId: t.workspaceId ?? null,
        userEmail,
        workspaceType: workspace,
        syncStatus: "synced",
        version: t.version ?? 1,
      });
    }

    // Hard-deleted documents are absent from /tasks response.
    await pruneSyncedTasksMissingOnServer(userEmail, workspace, serverIds);
  } catch (err) {
    console.warn("SERVER SYNC FAILED", err);
  }
}

export async function fetchTasksFromServer(
  token: string,
  workspaceType: string,
  workspaceId?: string | null
): Promise<Task[]> {
  const params = new URLSearchParams({ workspaceType });
  if (workspaceId) params.set("workspaceId", workspaceId);

  const res = await fetch(`${API_BASE}/tasks?${params.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("fetch failed");

  const serverTasks = await res.json();
  return serverTasks.map((t: any) => ({
    id: t.taskId ?? t.id,
    text: t.text,
    labels: t.labels ?? [],
    subtasks: normalizeSubtasks(t.subtasks),
    completed: Boolean(t.completed),
    archived: Boolean(t.archived),
    deleted: Boolean(t.deleted),
    deletedAt: t.deletedAt ?? null,
    image: t.imageUrl ?? t.image ?? null,
    imageUrl: t.imageUrl ?? null,
    imageUrlExpiry: t.imageUrlExpiry ?? null,
    reminderAt: t.reminderAt ?? null,
    sectionId: t.sectionId ?? null,
    createdAt: t.createdAt ?? Date.now(),
    updatedAt: t.updatedAt ?? Date.now(),
    userEmail: "",
    workspaceType: t.workspaceType ?? workspaceType,
    workspaceId: t.workspaceId ?? workspaceId ?? null,
    syncStatus: "synced",
    version: t.version ?? 1,
    dirty: false,
  }));
}

export async function apiCreateTask(task: any, token: string, imageFile?: File | null) {
  const fd = buildFormData({
    id: task.id,
    text: task.text,
    workspaceType: task.workspaceType,
    workspaceId: task.workspaceId ?? null,
    reminderAt: task.reminderAt ?? null,
    labels: JSON.stringify(task.labels ?? []),
    subtasks: JSON.stringify(task.subtasks ?? []),
    ...(task.sectionId ? { sectionId: task.sectionId } : {}), // empty string nahi
  }, imageFile);

  const res = await fetch(`${API_BASE}/tasks`, {
    method: "POST",
    headers: authHeadersNoContentType(token),
    body: fd,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(getErrorMessage(data, "create failed"));
  return data;
}

export async function apiBulkCreateTasks(tasks: any[], token: string) {
  const res = await fetch(`${API_BASE}/tasks/bulk-create`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ tasks }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(getErrorMessage(data, "bulk create failed"));
  return data;
}


export async function apiUpdateTask(
  id: string,
  payload: any,
  token: string,
  imageFile?: File | null,
  removeImage?: boolean
) {
  const fd = buildFormData(
    { ...payload, ...(removeImage ? { removeImage: "true" } : {}) },
    imageFile
  );

  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: "PUT",
    headers: authHeadersNoContentType(token),
    body: fd,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(getErrorMessage(data, "update failed"));
  return data;
}

export async function apiDeleteTask(id: string, token: string) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error("delete failed");
}

export async function apiFetchTaskImageUrl(id: string, token: string) {
  const res = await fetch(`${API_BASE}/tasks/${id}/image-url`, {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error("image url fetch failed");
  return res.json() as Promise<{ imageUrl: string | null; imageUrlExpiry: number | null }>;
}
