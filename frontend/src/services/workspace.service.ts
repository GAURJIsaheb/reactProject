const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

async function apiCall(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

// ─── Create a workspace record server-side, returns a real workspaceId ────────
export async function createServerWorkspace(
  name:  string,
  emoji: string,
  token: string
): Promise<{ workspaceId: string }> {
  return apiCall('/workspace', token, {
    method: 'POST',
    body:   JSON.stringify({ name, emoji }),
  });
}

// ─── List workspaces the caller owns or is a member of ────────────────────────
export async function listMyWorkspaces(
  token: string
): Promise<{ workspaces: { workspaceId: string; type: string; emoji: string; isOwner: boolean; memberCount: number }[] }> {
  return apiCall('/workspace/mine', token);
}

export async function deleteWorkspace(workspaceId: string, token: string): Promise<void> {
  await apiCall(`/workspace/${workspaceId}`, token, {
    method: 'DELETE',
  });
}

// ─── Send invite email to a collaborator ─────────────────────────────────────
export async function inviteMemberToWorkspace(
  workspaceId:  string,
  invitedEmail: string,
  token:        string
): Promise<void> {
  await apiCall('/workspace/invite', token, {
    method: 'POST',
    body:   JSON.stringify({ workspaceId, invitedEmail }),
  });
}

// ─── Accept invite via token from email link ──────────────────────────────────
export async function acceptWorkspaceInvite(
  inviteToken: string,
  authToken:   string
): Promise<{ workspaceId: string; workspaceName: string }> {
  return apiCall(`/workspace/invite/accept?token=${inviteToken}`, authToken);
}

// ─── List all members of a workspace ─────────────────────────────────────────
export async function getWorkspaceMembers(
  workspaceId: string,
  token:       string
): Promise<{
  owner:   { _id: string; name: string; email: string };
  members: { _id: string; name: string; email: string }[];
}> {
  return apiCall(`/workspace/${workspaceId}/members`, token);
}

// ─── Remove a member (owner only) ────────────────────────────────────────────
export async function removeMemberFromWorkspace(
  workspaceId: string,
  memberId:    string,
  token:       string
): Promise<void> {
  await apiCall(`/workspace/${workspaceId}/members/${memberId}`, token, {
    method: 'DELETE',
  });
}

// ─── Get pending invites for a workspace (owner only) ────────────────────────
export async function getPendingInvites(
  workspaceId: string,
  token:       string
): Promise<{ invites: { invitedEmail: string; expiresAt: number }[] }> {
  return apiCall(`/workspace/${workspaceId}/pending-invites`, token);
}

// ─── Revoke a pending invite ──────────────────────────────────────────────────
export async function revokeWorkspaceInvite(
  workspaceId:  string,
  inviteToken:  string,
  authToken:    string
): Promise<void> {
  await apiCall(`/workspace/${workspaceId}/invite/${inviteToken}`, authToken, {
    method: 'DELETE',
  });
}
