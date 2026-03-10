import { useState } from 'react';
import { toast } from 'sonner';
import { UserPlus, X, Mail, Loader2, Users } from 'lucide-react';
import { inviteMemberToWorkspace, getWorkspaceMembers, removeMemberFromWorkspace } from '@/services/workspace.service';
import { useAuthStore } from '@/zustand/authStore';

type Member = { _id: string; name: string; email: string };

type Props = {
  workspaceId:   string;
  workspaceName: string;
  onClose:       () => void;
};

type Tab = 'invite' | 'members';

export default function InviteModal({ workspaceId, workspaceName, onClose }: Props) {
  const token     = useAuthStore((s) => s.token);
  const userEmail = useAuthStore((s) => s.userEmail);

  const [tab, setTab]           = useState<Tab>('invite');
  const [email, setEmail]       = useState('');
  const [sending, setSending]   = useState(false);

  const [members, setMembers]   = useState<{ owner: Member; members: Member[] } | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // ── Load members when tab switches ──────────────────────────────────────────
  const handleTabChange = async (t: Tab) => {
    setTab(t);
    if (t === 'members' && !members) {
      setLoadingMembers(true);
      try {
        const data = await getWorkspaceMembers(workspaceId, token!);
        setMembers(data);
      } catch (e: unknown) {
        toast.error((e as Error).message);
      } finally {
        setLoadingMembers(false);
      }
    }
  };

  // ── Send invite ──────────────────────────────────────────────────────────────
  const handleInvite = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) { toast.error('Enter a valid email'); return; }
    if (trimmed === userEmail) { toast.error("You can't invite yourself"); return; }
    if (!navigator.onLine) { toast.warning("You're offline. Sending invites requires an internet connection."); return; }

    setSending(true);
    try {
      await inviteMemberToWorkspace(workspaceId, trimmed, token!);
      toast.success(`Invite sent to ${trimmed}`);
      setEmail('');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  // ── Remove member ────────────────────────────────────────────────────────────
  const handleRemove = async (memberId: string, memberEmail: string) => {
    try {
      await removeMemberFromWorkspace(workspaceId, memberId, token!);
      setMembers((prev) =>
        prev
          ? { ...prev, members: prev.members.filter((m) => m._id !== memberId) }
          : prev
      );
      toast.success(`Removed ${memberEmail}`);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  };

  const isOwner = members?.owner.email === userEmail;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10
                      bg-[#121625] shadow-2xl overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4
                        border-b border-white/8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center
                            bg-indigo-500/20 border border-indigo-400/30">
              <UserPlus size={13} className="text-indigo-400" />
            </div>
            <span className="font-semibold text-sm text-slate-200">
              Collaborate on <span className="text-indigo-300">{workspaceName}</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center
                       text-slate-500 hover:text-slate-300 hover:bg-white/5 transition"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────────── */}
        <div className="flex border-b border-white/8">
          {(['invite', 'members'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`flex-1 py-2.5 text-xs font-semibold capitalize transition
                ${tab === t
                  ? 'text-indigo-300 border-b-2 border-indigo-400'
                  : 'text-slate-500 hover:text-slate-300'
                }`}
            >
              {t === 'invite' ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Mail size={12} /> Invite
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <Users size={12} /> Members
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Invite tab ─────────────────────────────────────────────────────── */}
        {tab === 'invite' && (
          <div className="p-5">
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">
              Collaborator's email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              placeholder="colleague@gmail.com"
              className="w-full h-10 rounded-xl border border-white/10 bg-[#0f1117]
                         px-3 text-sm text-slate-200 outline-none placeholder:text-slate-600
                         focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40
                         transition mb-4"
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="h-9 px-4 rounded-xl text-xs border border-white/10
                           text-slate-400 hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={sending || !email.trim()}
                className="h-9 px-4 rounded-xl text-xs font-semibold
                           bg-indigo-500 text-white hover:bg-indigo-600
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center gap-1.5 transition"
              >
                {sending
                  ? <><Loader2 size={12} className="animate-spin" /> Sending…</>
                  : <><Mail size={12} /> Send Invite</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── Members tab ────────────────────────────────────────────────────── */}
        {tab === 'members' && (
          <div className="p-5 max-h-72 overflow-y-auto space-y-2">
            {loadingMembers && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-indigo-400" />
              </div>
            )}

            {members && (
              <>
                {/* Owner */}
                <MemberRow
                  name={members.owner.name}
                  email={members.owner.email}
                  badge="Owner"
                  isSelf={members.owner.email === userEmail}
                />

                {/* Members */}
                {members.members.length === 0 && (
                  <p className="text-xs text-slate-600 text-center py-4">
                    No other members yet. Invite someone above!
                  </p>
                )}
                {members.members.map((m) => (
                  <MemberRow
                    key={m._id}
                    name={m.name}
                    email={m.email}
                    isSelf={m.email === userEmail}
                    onRemove={isOwner ? () => handleRemove(m._id, m.email) : undefined}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-component ─────────────────────────────────────────────────────────────
function MemberRow({
  name, email, badge, isSelf, onRemove,
}: {
  name: string; email: string; badge?: string;
  isSelf?: boolean; onRemove?: () => void;
}) {
  const initials = name ? name.slice(0, 2).toUpperCase() : email.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5
                    rounded-xl bg-white/4 border border-white/6">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center
                        bg-linear-to-br from-indigo-500/60 to-pink-500/60
                        text-xs font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-200 truncate">
            {name}{isSelf && <span className="ml-1 text-slate-500">(you)</span>}
          </p>
          <p className="text-[11px] text-slate-500 truncate">{email}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full
                           bg-indigo-500/20 text-indigo-300 border border-indigo-400/20">
            {badge}
          </span>
        )}
        {onRemove && !isSelf && (
          <button
            onClick={onRemove}
            className="w-6 h-6 rounded-lg flex items-center justify-center
                       text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition"
            title="Remove member"
          >
            <X size={11} />
          </button>
        )}
      </div>
    </div>
  );
}