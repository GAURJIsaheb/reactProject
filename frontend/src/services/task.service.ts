import { authHeaders } from "@/services/auth.service";
import { addTask, pruneSyncedTasksMissingOnServer } from "@/infrastructure/lib/idb";

const API_BASE = `http://${window.location.hostname}:4000`;

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
        image: t.imageUrl ?? t.image ?? null, // signed URL if cached, otherwise S3 key
        completed: t.completed,
        archived: t.archived,
        deleted: t.deleted,
        deletedAt: t.deletedAt ?? null,
        sectionId: t.sectionId ?? null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        userEmail,
        workspaceType: workspace,
        syncStatus: "synced",
      });
    }

    // Hard-deleted documents are absent from /tasks response.
    await pruneSyncedTasksMissingOnServer(userEmail, workspace, serverIds);
  } catch (err) {
    console.warn("SERVER SYNC FAILED", err);
  }
}

export async function apiCreateTask(task: any, token: string, imageFile?: File | null) {
  const fd = buildFormData({
    id: task.id,
    text: task.text,
    workspaceType: task.workspaceType,
    ...(task.sectionId ? { sectionId: task.sectionId } : {}), // empty string nahi
  }, imageFile);

  const res = await fetch(`${API_BASE}/tasks`, {
    method: "POST",
    headers: authHeadersNoContentType(token),
    body: fd,
  });

  if (!res.ok) throw new Error("create failed");
  return res.json();
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

  if (!res.ok) throw new Error("update failed");
  return res.json();
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
