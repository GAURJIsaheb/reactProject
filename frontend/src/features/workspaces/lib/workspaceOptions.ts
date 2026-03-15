import {
  DEFAULT_WORKSPACES,
  type ServerWorkspace,
  type WorkspaceOption,
} from "../model/workspace";

export function workspaceStorageKey(email: string) {
  return `workspace:${email}`;
}

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

function getServerWorkspaceLabel(workspace: { name?: string; type: string }) {
  return workspace.name?.trim() || workspace.type;
}

export function mergeWorkspaceOptions(
  previous: WorkspaceOption[],
  workspaces: ServerWorkspace[]
): WorkspaceOption[] {
  const serverIds = new Set(workspaces.map((workspace) => workspace.workspaceId));
  const byValue = new Map<string, WorkspaceOption>();

  for (const option of DEFAULT_WORKSPACES) {
    byValue.set(option.value, { ...option });
  }

  for (const option of previous) {
    if (isBuiltInWorkspace(option.value)) {
      const builtIn = byValue.get(option.value);
      if (!builtIn) continue;
      byValue.set(option.value, {
        ...builtIn,
        label: option.label || builtIn.label,
      });
      continue;
    }

    if (option.id && !serverIds.has(option.id)) continue;
    byValue.set(option.value, { ...option });
  }

  for (const workspace of workspaces) {
    const workspaceLabel = getServerWorkspaceLabel(workspace);
    const slug = toWorkspaceValue(workspaceLabel);
    const existing = byValue.get(slug);

    if (existing) {
      byValue.set(slug, {
        ...existing,
        label: workspaceLabel,
        emoji: workspace.emoji || existing.emoji,
        id: workspace.workspaceId,
        memberCount: workspace.memberCount ?? existing.memberCount ?? 1,
        isOwner: workspace.isOwner,
      });
      continue;
    }

    const taken = new Set(byValue.keys());
    let finalValue = slug;
    let suffix = 2;
    while (taken.has(finalValue)) {
      finalValue = `${slug}-${suffix}`;
      suffix += 1;
    }

    byValue.set(finalValue, {
      value: finalValue,
      label: workspaceLabel,
      emoji: workspace.emoji || "📁",
      id: workspace.workspaceId,
      memberCount: workspace.memberCount ?? 1,
      isOwner: workspace.isOwner,
    });
  }

  return [...byValue.values()];
}

export function getInitialWorkspaceOptions(
  email: string,
  readCache: (userEmail: string) => WorkspaceOption[] | null
): WorkspaceOption[] {
  try {
    const parsed = readCache(email) ?? [];
    if (!Array.isArray(parsed)) return DEFAULT_WORKSPACES;

    const merged = new Map<string, WorkspaceOption>();
    for (const option of DEFAULT_WORKSPACES) {
      merged.set(option.value, { ...option });
    }

    for (const option of parsed) {
      if (!option?.value || !option?.label) continue;

      const existing = merged.get(option.value);
      merged.set(option.value, {
        value: option.value,
        label: option.label,
        emoji: option.emoji || existing?.emoji || "📁",
        id: isBuiltInWorkspace(option.value) ? undefined : option.id,
        memberCount: option.memberCount ?? existing?.memberCount ?? 1,
        isOwner: option.isOwner ?? existing?.isOwner ?? true,
      });
    }

    return [...merged.values()];
  } catch {
    return DEFAULT_WORKSPACES;
  }
}

