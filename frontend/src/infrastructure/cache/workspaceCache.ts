import type { Section } from "@/shared/types/section";
import type { WorkspaceOption } from "@/features/workspaces/model/workspace";

function workspaceOptionsKey(email: string) {
  return `workspace-options:${email}`;
}

function sectionSnapshotKey(
  email: string,
  workspaceType: string,
  workspaceId?: string | null
) {
  return `section-snapshot:${email}:${workspaceId ?? workspaceType}`;
}

export function readCachedWorkspaceOptions(email: string): WorkspaceOption[] | null {
  try {
    const raw = localStorage.getItem(workspaceOptionsKey(email));
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCachedWorkspaceOptions(email: string, options: WorkspaceOption[]) {
  localStorage.setItem(workspaceOptionsKey(email), JSON.stringify(options));
}

export function readCachedSections(
  email: string,
  workspaceType: string,
  workspaceId?: string | null
): Section[] {
  try {
    const raw = localStorage.getItem(sectionSnapshotKey(email, workspaceType, workspaceId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCachedSections(
  email: string,
  workspaceType: string,
  sections: Section[],
  workspaceId?: string | null
) {
  const snapshot = sections.map((section) => ({
    id: section.id,
    title: section.title,
    order: section.order ?? 0,
    createdAt: section.createdAt ?? Date.now(),
    updatedAt: section.updatedAt ?? Date.now(),
    workspaceType: section.workspaceType ?? workspaceType,
    workspaceId: section.workspaceId ?? workspaceId ?? null,
    userEmail: section.userEmail ?? email,
    dirty: Boolean(section.dirty),
  }));

  localStorage.setItem(
    sectionSnapshotKey(email, workspaceType, workspaceId),
    JSON.stringify(snapshot)
  );
}
