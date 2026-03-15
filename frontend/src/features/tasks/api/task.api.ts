import { authHeaders } from "@/services/auth.service";
import { API_BASE } from "@/infrastructure/api/base";

function getErrorMessage(data: { error?: string; message?: string } | null | undefined, fallback: string) {
  return data?.error || data?.message || fallback;
}

function buildFormData(data: Record<string, unknown>, imageFile?: File | null): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
  if (imageFile) formData.append("image", imageFile);
  return formData;
}

function authHeadersNoContentType(token: string) {
  return { Authorization: `Bearer ${token}` };
}


export async function apiCreateTask(task: any, token: string, imageFile?: File | null) {
  const formData = buildFormData(
    {
      id: task.id,
      text: task.text,
      workspaceType: task.workspaceType,
      workspaceId: task.workspaceId ?? null,
      reminderAt: task.reminderAt ?? null,
      labels: JSON.stringify(task.labels ?? []),
      subtasks: JSON.stringify(task.subtasks ?? []),
      ...(task.sectionId ? { sectionId: task.sectionId } : {}),
    },
    imageFile
  );

  const res = await fetch(`${API_BASE}/tasks`, {
    method: "POST",
    headers: authHeadersNoContentType(token),
    body: formData,
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
  const formData = buildFormData(
    { ...payload, ...(removeImage ? { removeImage: "true" } : {}) },
    imageFile
  );

  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: "PUT",
    headers: authHeadersNoContentType(token),
    body: formData,
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

