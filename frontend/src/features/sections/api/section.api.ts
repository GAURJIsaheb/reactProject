import type { Section } from "@/shared/types/section";
import { authHeaders } from "@/services/auth.service";
import { API_BASE } from "@/infrastructure/api/base";

function normalizeSection(section: any): Section {
  return {
    id: section.id ?? section.sectionId ?? section._id,
    workspaceType: section.workspaceType ?? "personal",
    userEmail: section.userEmail ?? "",
    title: section.title,
    order: section.order ?? 0,
    createdAt: section.createdAt ?? Date.now(),
    updatedAt: section.updatedAt ?? Date.now(),
    workspaceId: section.workspaceId ?? null,
    dirty: false,
  };
}

export async function fetchSections(
  token:         string,
  workspaceType: string,
  workspaceId?:  string    // pass for collab workspaces
): Promise<Section[]> {
  const params = new URLSearchParams({ workspaceType });
  if (workspaceId) params.set("workspaceId", workspaceId);

  const res = await fetch(`${API_BASE}/sections?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch sections");
  const data = await res.json();
  return data.map((section: any) => normalizeSection(section));
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
  const res = await fetch(`${API_BASE}/sections`, {
    method:  "POST",
    headers: authHeaders(token),
    body:    JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create section");
  const data = await res.json();
  return normalizeSection(data.section ?? data);
}

export async function updateSectionApi(
  token:     string,
  sectionId: string,
  payload:   Partial<{ title: string; order: number; workspaceId: string }>
): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/sections/${sectionId}`, {
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
  const res = await fetch(`${API_BASE}/sections/${sectionId}`, {
    method:  "DELETE",
    headers: authHeaders(token),
    body:    JSON.stringify({ workspaceId }),
  });
  if (!res.ok) throw new Error("Failed to delete section");
  return res.json();
}
