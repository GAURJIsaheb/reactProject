import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { UserPlus, X, Mail, Loader2, Users, Clock3, ShieldCheck } from 'lucide-react';
import {
  inviteMemberToWorkspace,
  getWorkspaceMembers,
  removeMemberFromWorkspace,
  getPendingInvites,
  revokeWorkspaceInvite,
} from '@/services/workspace.service';
import { useAuthStore } from '@/zustand/authStore';

type Member = { _id: string; name?: string; email: string };
type PendingInvite = { token: string; invitedEmail: string; createdAt: number; expiresAt: number };

type Props = {
  workspaceId: string;
  workspaceName: string;
  isOwner: boolean;
  onClose: () => void;
};

type Tab = 'invite' | 'members' | 'pending';

export default function InviteModal({ workspaceId, workspaceName, isOwner, onClose }: Props) {
  const token = useAuthStore((s) => s.token);
  const userEmail = useAuthStore((s) => s.userEmail);

  const [tab, setTab] = useState<Tab>('invite');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const [members, setMembers] = useState<{ owner: Member; members: Member[] } | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [pendingInvites, setPendingInvites] = useState<PendingInvite[] | null>(null);
  const [loadingPending, setLoadingPending] = useState(false);
  const [revokingToken, setRevokingToken] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const data = await getWorkspaceMembers(workspaceId, token!);
      setMembers(data);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setLoadingMembers(false);
    }
  }, [token, workspaceId]);

  const loadPendingInvites = useCallback(async () => {
    if (!isOwner) return;
    setLoadingPending(true);
    try {
      const data = await getPendingInvites(workspaceId, token!);
      setPendingInvites(data.invites);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setLoadingPending(false);
    }
  }, [isOwner, token, workspaceId]);

  const refreshWorkspacePeople = useCallback(async () => {
    await loadMembers();
    if (isOwner) {
      await loadPendingInvites();
    }
  }, [isOwner, loadMembers, loadPendingInvites]);

  useEffect(() => {
    if (tab === 'members') void loadMembers();
    if (tab === 'pending' && isOwner) void loadPendingInvites();
  }, [isOwner, loadMembers, loadPendingInvites, tab]);

  useEffect(() => {
    void refreshWorkspacePeople();

    const interval = window.setInterval(() => {
      void refreshWorkspacePeople();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [refreshWorkspacePeople]);

  useEffect(() => {
    const handleWorkspaceMembersChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId !== workspaceId) return;

      void refreshWorkspacePeople();
    };

    window.addEventListener('workspace-members-changed', handleWorkspaceMembersChanged);
    return () => {
      window.removeEventListener('workspace-members-changed', handleWorkspaceMembersChanged);
    };
  }, [refreshWorkspacePeople, workspaceId]);

  const handleTabChange = async (nextTab: Tab) => {
    setTab(nextTab);
  };

  const handleInvite = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }
    if (trimmed === userEmail) {
      toast.error("You can't invite yourself");
      return;
    }
    if (!navigator.onLine) {
      toast.warning("You're offline. Sending invites requires an internet connection.");
      return;
    }

    setSending(true);
    try {
      await inviteMemberToWorkspace(workspaceId, trimmed, token!);
      toast.success(`Invite sent to ${trimmed}`);
      setEmail('');
      window.dispatchEvent(new CustomEvent('workspace-members-changed', {
        detail: { workspaceId },
      }));
      if (isOwner) {
        await loadPendingInvites();
      }
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const handleRemove = async (memberId: string, memberEmail: string) => {
    try {
      await removeMemberFromWorkspace(workspaceId, memberId, token!);
      setMembers((prev) =>
        prev ? { ...prev, members: prev.members.filter((m) => m._id !== memberId) } : prev
      );
      window.dispatchEvent(new CustomEvent('workspace-members-changed', {
        detail: { workspaceId },
      }));
      if (isOwner) {
        await loadPendingInvites();
      }
      toast.success(`Removed ${memberEmail}`);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  };

  const handleRevokeInvite = async (inviteToken: string, invitedEmail: string) => {
    setRevokingToken(inviteToken);
    try {
      await revokeWorkspaceInvite(workspaceId, inviteToken, token!);
      setPendingInvites((prev) => prev?.filter((invite) => invite.token !== inviteToken) ?? []);
      window.dispatchEvent(new CustomEvent('workspace-members-changed', {
        detail: { workspaceId },
      }));
      await loadMembers();
      toast.success(`Invite revoked for ${invitedEmail}`);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setRevokingToken(null);
    }
  };

  const derivedOwner = members?.owner.email === userEmail;
  const canManageMembers = isOwner || derivedOwner;
  const tabs: Tab[] = isOwner ? ['invite', 'members', 'pending'] : ['invite', 'members'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-3">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#121625] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-500/20 border border-indigo-400/30">
              <UserPlus size={15} className="text-indigo-300" />
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-100">Workspace invites</p>
              <p className="text-xs text-slate-500">
                Manage collaborators for <span className="text-indigo-300">{workspaceName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex border-b border-white/8 bg-black/10">
          {tabs.map((item) => (
            <button
              key={item}
              onClick={() => void handleTabChange(item)}
              className={`flex-1 py-3 text-xs font-semibold capitalize transition ${
                tab === item
                  ? 'text-indigo-300 border-b-2 border-indigo-400 bg-indigo-500/5'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                {item === 'invite' && <Mail size={12} />}
                {item === 'members' && <Users size={12} />}
                {item === 'pending' && <Clock3 size={12} />}
                {item}
              </span>
            </button>
          ))}
        </div>

        <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
          <div className="p-5 border-b md:border-b-0 md:border-r border-white/8">
            <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={14} className="text-indigo-300" />
                <p className="text-sm font-semibold text-slate-100">Invite teammate</p>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Send a secure email invite. Re-sending the same email replaces the previous pending invite.
              </p>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">
                Collaborator's email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleInvite()}
                placeholder="colleague@gmail.com"
                className="w-full h-11 rounded-xl border border-white/10 bg-[#0f1117] px-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition"
              />

              <div className="flex gap-2 justify-end mt-4">
                <button
                  onClick={onClose}
                  className="h-9 px-4 rounded-xl text-xs border border-white/10 text-slate-400 hover:bg-white/5 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => void handleInvite()}
                  disabled={sending || !email.trim()}
                  className="h-9 px-4 rounded-xl text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition"
                >
                  {sending ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail size={12} />
                      Send Invite
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="p-5">
            {tab === 'members' && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Current members</p>
                  <p className="text-xs text-slate-500">See who has already joined this workspace.</p>
                </div>
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {loadingMembers && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={20} className="animate-spin text-indigo-400" />
                    </div>
                  )}

                  {members && (
                    <>
                      <MemberRow
                        name={members.owner.name}
                        email={members.owner.email}
                        badge="Owner"
                        isSelf={members.owner.email === userEmail}
                      />
                      {members.members.length === 0 && (
                        <p className="text-xs text-slate-600 text-center py-4">
                          No other members yet. Invite someone from the left panel.
                        </p>
                      )}
                      {members.members.map((member) => (
                        <MemberRow
                          key={member._id}
                          name={member.name}
                          email={member.email}
                          isSelf={member.email === userEmail}
                          onRemove={canManageMembers ? () => void handleRemove(member._id, member.email) : undefined}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {tab === 'invite' && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Workspace summary</p>
                  <p className="text-xs text-slate-500">
                    Use the left panel to invite. Use tabs to review joined members and pending requests.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/3 p-4 text-xs text-slate-400 space-y-2">
                  <p>Owner can revoke pending invites anytime.</p>
                  <p>Joined members move from pending list to members automatically after accept.</p>
                  <p>Invite links expire after 7 days.</p>
                </div>
              </div>
            )}

            {tab === 'pending' && isOwner && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Pending invites</p>
                  <p className="text-xs text-slate-500">Owner can revoke invites that have not been accepted yet.</p>
                </div>
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {loadingPending && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={20} className="animate-spin text-indigo-400" />
                    </div>
                  )}
                  {!loadingPending && pendingInvites?.length === 0 && (
                    <p className="text-xs text-slate-600 text-center py-4">
                      No pending invites right now.
                    </p>
                  )}
                  {pendingInvites?.map((invite) => (
                    <PendingInviteRow
                      key={invite.token}
                      invite={invite}
                      busy={revokingToken === invite.token}
                      onRevoke={() => void handleRevokeInvite(invite.token, invite.invitedEmail)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberRow({
  name,
  email,
  badge,
  isSelf,
  onRemove,
}: {
  name?: string;
  email: string;
  badge?: string;
  isSelf?: boolean;
  onRemove?: () => void;
}) {
  const displayName = name?.trim() || email.split('@')[0] || 'Member';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/4 border border-white/6">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-linear-to-br from-indigo-500/60 to-pink-500/60 text-xs font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-200 truncate">
            {displayName}
            {isSelf && <span className="ml-1 text-slate-500">(you)</span>}
          </p>
          <p className="text-[11px] text-slate-500 truncate">{email}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/20">
            {badge}
          </span>
        )}
        {onRemove && !isSelf && (
          <button
            onClick={onRemove}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition"
            title="Remove member"
          >
            <X size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

function PendingInviteRow({
  invite,
  busy,
  onRevoke,
}: {
  invite: PendingInvite;
  busy: boolean;
  onRevoke: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/4 border border-white/6">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-200 truncate">{invite.invitedEmail}</p>
        <p className="text-[11px] text-slate-500 truncate">
          Sent {new Date(invite.createdAt).toLocaleDateString()} | Expires {new Date(invite.expiresAt).toLocaleDateString()}
        </p>
      </div>
      <button
        onClick={onRevoke}
        disabled={busy}
        className="h-7 px-2.5 rounded-lg text-[11px] font-medium border border-red-400/20 text-red-300 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {busy ? 'Revoking...' : 'Revoke'}
      </button>
    </div>
  );
}
