import type { Section } from "@/shared/types/section";
import { authHeaders } from "@/services/auth.service";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export async function fetchSections(
  token:         string,
  workspaceType: string,
  workspaceId?:  string    // pass for collab workspaces
): Promise<Section[]> {
  const params = new URLSearchParams({ workspaceType });
  if (workspaceId) params.set("workspaceId", workspaceId);

  const res = await fetch(`${BASE}/sections?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch sections");
  return res.json();
}

export async function createSectionApi(
  token:   string,
  payload: {
    id:            string;
    title:         string;
    workspaceType: string;
    order:         number;
    workspaceId?:  string;  // pass for collab workspaces
  }
): Promise<Section> {
  const res = await fetch(`${BASE}/sections`, {
    method:  "POST",
    headers: authHeaders(token),
    body:    JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create section");
  return res.json();
}

export async function updateSectionApi(
  token:     string,
  sectionId: string,
  payload:   Partial<{ title: string; order: number; workspaceId: string }>
): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/sections/${sectionId}`, {
    method:  "PATCH",
    headers: authHeaders(token),
    body:    JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update section");
  return res.json();
}

export async function deleteSectionApi(
  token:        string,
  sectionId:    string,
  workspaceId?: string    // pass for collab workspaces so server can broadcast
): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/sections/${sectionId}`, {
    method:  "DELETE",
    headers: authHeaders(token),
    body:    JSON.stringify({ workspaceId }),
  });
  if (!res.ok) throw new Error("Failed to delete section");
  return res.json();
}