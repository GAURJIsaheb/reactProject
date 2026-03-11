const DEFAULT_WORKSPACE_EMOJIS = {
  personal: '🪪',
  professional: '🧑🏻‍💼',
};

export function normalizeWorkspaceType(workspaceType) {
  return String(workspaceType ?? 'personal').trim().toLowerCase() || 'personal';
}

export function isDefaultWorkspaceType(workspaceType) {
  const type = normalizeWorkspaceType(workspaceType);
  return type === 'personal' || type === 'professional';
}

export function getDefaultWorkspaceEmoji(workspaceType) {
  const type = normalizeWorkspaceType(workspaceType);
  return DEFAULT_WORKSPACE_EMOJIS[type] ?? '📁';
}
