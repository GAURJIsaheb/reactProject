import { API_BASE } from "@/infrastructure/api/base";

import type { ServerWorkspace } from "../model/workspace";

function getErrorMessage(data: { error?: string; message?: string } | null | undefined, fallback: string) {
  return data?.error ?? data?.message ?? fallback;
}

async function apiCall(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(getErrorMessage(data, `Request failed (${res.status})`)) as Error & {
      status?: number;
    };
    error.status = res.status;
    throw error;
  }

  return data;
}

export async function createServerWorkspace(
  name: string,
  emoji: string,
  token: string
): Promise<{ workspaceId: string }> {
  return apiCall("/workspace", token, {
    method: "POST",
    body: JSON.stringify({ name, emoji }),
  });
}

export async function listMyWorkspaces(
  token: string
): Promise<{ workspaces: ServerWorkspace[] }> {
  return apiCall("/workspace/mine", token);
}

export async function deleteWorkspace(workspaceId: string, token: string): Promise<void> {
  await apiCall(`/workspace/${workspaceId}`, token, { method: "DELETE" });
}

export async function inviteMemberToWorkspace(
  workspaceId: string,
  invitedEmail: string,
  token: string
): Promise<void> {
  await apiCall("/workspace/invite", token, {
    method: "POST",
    body: JSON.stringify({ workspaceId, invitedEmail }),
  });
}

export async function acceptWorkspaceInvite(
  inviteToken: string,
  authToken: string
): Promise<{ workspaceId: string; workspaceName: string }> {
  return apiCall(`/workspace/invite/accept?token=${inviteToken}`, authToken);
}

export async function getWorkspaceMembers(
  workspaceId: string,
  token: string
): Promise<{
  owner: { _id: string; name?: string; email: string };
  members: { _id: string; name?: string; email: string }[];
}> {
  return apiCall(`/workspace/${workspaceId}/members`, token);
}

export async function removeMemberFromWorkspace(
  workspaceId: string,
  memberId: string,
  token: string
): Promise<void> {
  await apiCall(`/workspace/${workspaceId}/members/${memberId}`, token, {
    method: "DELETE",
  });
}

export async function getPendingInvites(
  workspaceId: string,
  token: string
): Promise<{ invites: { token: string; invitedEmail: string; createdAt: number; expiresAt: number }[] }> {
  return apiCall(`/workspace/${workspaceId}/pending-invites`, token);
}

export async function revokeWorkspaceInvite(
  workspaceId: string,
  inviteToken: string,
  token: string
): Promise<void> {
  await apiCall(`/workspace/${workspaceId}/invite/${inviteToken}`, token, {
    method: "DELETE",
  });
}

export async function getWorkspaceSyncState(
  workspaceId: string,
  token: string
): Promise<{ workspaceId: string; syncVersion: number; lastChangedAt: number }> {
  return apiCall(`/workspace/${workspaceId}/sync-state`, token);
}

