//API_BASE, helpers
export const API_BASE = "http://localhost:4000";

export function isBuiltInWorkspaceType(workspaceType: string): boolean {
  return workspaceType === "personal" || workspaceType === "professional";
}