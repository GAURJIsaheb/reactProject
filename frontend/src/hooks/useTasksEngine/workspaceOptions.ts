//All Piure Functions for useTask Engine
import type { WorkspaceOption } from "@/features/workspaces/model/workspace";
import {
  readCachedWorkspaceOptions,
} from "@/infrastructure/cache/workspaceCache";

export const DEFAULT_WORKSPACES: WorkspaceOption[] = [
  { value: "personal",     label: "Personal",     emoji: "🪪",       memberCount: 1, isOwner: true },
  { value: "professional", label: "Professional", emoji: "🧑🏻‍💼", memberCount: 1, isOwner: true },
];

export function isBuiltInWorkspace(value: string) {
  return value === "personal" || value === "professional";
}

export function toWorkspaceValue(name: string) {
  return (
    name.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `workspace-${Date.now()}`
  );
}

function getServerWorkspaceLabel(ws: { name?: string; type: string }) {
  return ws.name?.trim() || ws.type;
}

export function mergeWorkspaceOptions(
  previous: WorkspaceOption[],
  workspaces: Array<{
    workspaceId: string;
    name?: string;
    type: string;
    emoji?: string;
    memberCount?: number;
    isOwner?: boolean;
  }>
): WorkspaceOption[] {
  const serverIds = new Set(workspaces.map((w) => w.workspaceId));
  const byValue = new Map<string, WorkspaceOption>();

  for (const opt of DEFAULT_WORKSPACES) {
    byValue.set(opt.value, { ...opt });
  }

  for (const opt of previous) {
    if (isBuiltInWorkspace(opt.value)) {
      const builtIn = byValue.get(opt.value)!;
      byValue.set(opt.value, { ...builtIn, label: opt.label || builtIn.label });
      continue;
    }
    if (opt.id && !serverIds.has(opt.id)) continue;
    byValue.set(opt.value, { ...opt });
  }

  for (const ws of workspaces) {
    const label = getServerWorkspaceLabel(ws);
    const slug  = toWorkspaceValue(label);
    const existing = byValue.get(slug);

    if (existing) {
      byValue.set(slug, {
        ...existing,
        label,
        emoji:       ws.emoji ?? existing.emoji,
        id:          ws.workspaceId,
        memberCount: ws.memberCount ?? existing.memberCount ?? 1,
        isOwner:     ws.isOwner,
      });
      continue;
    }

    const taken = new Set(byValue.keys());
    let finalValue = slug;
    let suffix = 2;
    while (taken.has(finalValue)) { finalValue = `${slug}-${suffix}`; suffix++; }

    byValue.set(finalValue, {
      value:       finalValue,
      label,
      emoji:       ws.emoji ?? "📁",
      id:          ws.workspaceId,
      memberCount: ws.memberCount ?? 1,
      isOwner:     ws.isOwner,
    });
  }

  return [...byValue.values()];
}

export function getInitialWorkspaceOptions(email: string): WorkspaceOption[] {
  try {
    const parsed = readCachedWorkspaceOptions(email) ?? [];
    if (!Array.isArray(parsed)) return DEFAULT_WORKSPACES;

    const merged = new Map<string, WorkspaceOption>();
    for (const opt of DEFAULT_WORKSPACES) merged.set(opt.value, { ...opt });

    for (const opt of parsed) {
      if (!opt?.value || !opt?.label) continue;
      const existing = merged.get(opt.value);
      merged.set(opt.value, {
        value:       opt.value,
        label:       opt.label,
        emoji:       opt.emoji ?? existing?.emoji ?? "📁",
        id:          isBuiltInWorkspace(opt.value) ? undefined : opt.id,
        memberCount: opt.memberCount ?? existing?.memberCount ?? 1,
        isOwner:     opt.isOwner    ?? existing?.isOwner    ?? true,
      });
    }

    return [...merged.values()];
  } catch {
    return DEFAULT_WORKSPACES;
  }
}