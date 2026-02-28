import type { Section } from "@/shared/types/section";

const BASE = "http://localhost:4000";

export function authHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchSections(
  token: string,
  workspaceType: string
): Promise<Section[]> {
  const res = await fetch(`${BASE}/sections?workspaceType=${workspaceType}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch sections");
  return res.json();
}

export async function createSectionApi(
  token: string,
  payload: { id: string; title: string; workspaceType: string; order: number }
): Promise<Section> {
  const res = await fetch(`${BASE}/sections`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create section");
  return res.json();
}

export async function updateSectionApi(
  token: string,
  sectionId: string,
  payload: Partial<{ title: string; order: number }>
): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/sections/${sectionId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update section");
  return res.json();
}

export async function deleteSectionApi(
  token: string,
  sectionId: string
): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/sections/${sectionId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete section");
  return res.json();
}