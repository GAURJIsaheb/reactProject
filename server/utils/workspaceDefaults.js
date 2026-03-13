//this file is just about the clean the input user will pass

const DEFAULT_WORKSPACE_EMOJIS = {
  personal: "\uD83E\uDEAA",
  professional: "\uD83E\uDDD1\uD83C\uDFFB\u200D\uD83D\uDCBC",
};

const DEFAULT_WORKSPACE_NAMES = {
  personal: "Personal",
  professional: "Professional",
};

export function normalizeWorkspaceType(workspaceType) {//mainly for weird casing
  return String(workspaceType ?? "personal").trim().toLowerCase() || "personal";
}

export function isDefaultWorkspaceType(workspaceType) {//preventing deleting default workspaces and switching to default when colloborated workspace get deleted
  const type = normalizeWorkspaceType(workspaceType);
  return type === "personal" || type === "professional";
}

export function getDefaultWorkspaceName(workspaceType) {
  const type = normalizeWorkspaceType(workspaceType);
  return DEFAULT_WORKSPACE_NAMES[type] ?? "Workspace";
}

export function getDefaultWorkspaceEmoji(workspaceType) {//default emoji
  const type = normalizeWorkspaceType(workspaceType);
  return DEFAULT_WORKSPACE_EMOJIS[type] ?? "\uD83D\uDCC1";
}

export function getWorkspaceDisplayName(workspace) {//name of the workspace for frontend to show
  const explicitName = String(workspace?.name ?? "").trim();
  if (explicitName) return explicitName;

  const type = String(workspace?.type ?? "").trim();
  if (!type) return "Workspace";
  if (isDefaultWorkspaceType(type)) return getDefaultWorkspaceName(type);
  return type;
}
