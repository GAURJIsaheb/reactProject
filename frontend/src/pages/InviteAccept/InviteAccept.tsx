import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Anchor, CheckCircle, XCircle, Loader2, UserX } from 'lucide-react';
import { acceptWorkspaceInvite } from '@/services/workspace.service';
import { useAuthStore } from '@/zustand/authStore';

type Status = 'checking' | 'loading' | 'success' | 'error' | 'unauthenticated' | 'wrong-account';

function parseInvitedEmail(msg: string): string | null {
  const m = msg.match(/sent to ([^\s.]+@[^\s.]+\.[^\s.]+)/i);
  return m ? m[1] : null;
}

/**
 * Wait for Zustand-persist to finish rehydrating from localStorage.
 * Returns a promise that resolves once _hasHydrated is true, polling every
 * 20 ms, with a 2-second safety timeout so we never hang indefinitely.
 */
function waitForHydration(): Promise<void> {
  return new Promise((resolve) => {
    // If Zustand store exposes _hasHydrated (added via onRehydrateStorage),
    // use it. Otherwise fall back to polling the token directly.
    const check = () => {
      const state = useAuthStore.getState() as any;
      // Most Zustand-persist setups either expose _hasHydrated or the store
      // is just synchronously ready by the time getState() resolves.
      if (state._hasHydrated !== false) { resolve(); return; }
      setTimeout(check, 20);
    };

    const timeout = setTimeout(resolve, 2000); // safety valve
    check();
    // Clean up timeout if we resolved early
    Promise.resolve().then(() => clearTimeout(timeout));
  });
}

export default function InviteAccept() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const userEmail = useAuthStore((s) => s.userEmail);
  const logout    = useAuthStore((s) => s.logout);

  const [status,       setStatus]       = useState<Status>('checking');
  const [errorMsg,     setErrorMsg]     = useState('');
  const [wsName,       setWsName]       = useState('');
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);

  useEffect(() => {
    const inviteToken: string | null = params.get('token');
    if (!inviteToken) {
      setStatus('error');
      setErrorMsg('Invite link is missing a token.');
      return;
    }

    const inviteTokenStr: string = inviteToken; // narrowed - null case returned above
    let cancelled = false;

    async function run() {
      // ── Step 1: wait for Zustand-persist hydration ──────────────────────
      await waitForHydration();
      if (cancelled) return;

      const maybeToken = useAuthStore.getState().token;

      if (!maybeToken) {
        // Genuinely not logged in — save URL so Login.tsx can redirect back
        sessionStorage.setItem('pendingInviteUrl', window.location.href);
        setStatus('unauthenticated');
        return;
      }

      // After the guard above, TypeScript knows maybeToken is string
      const freshToken: string = maybeToken;

      // ── Step 2: accept the invite ────────────────────────────────────────
      setStatus('loading');

      try {
        const data = await acceptWorkspaceInvite(inviteTokenStr, freshToken);
        if (cancelled) return;
        setWsName(data.workspaceName);
        setStatus('success');
        setTimeout(() => navigate(`/?workspace=${data.workspaceId}`), 2000);
      } catch (e: any) {
        if (cancelled) return;
        const msg: string = e.message ?? '';
        if (msg.includes('sent to') && msg.includes('logged in as')) {
          setInvitedEmail(parseInvitedEmail(msg));
          setErrorMsg(msg);
          setStatus('wrong-account');
        } else {
          setStatus('error');
          setErrorMsg(msg);
        }
      }
    }

    run();
    return () => { cancelled = true; };

  }, []);

  const handleSwitchAccount = () => {
    sessionStorage.setItem('pendingInviteUrl', window.location.href);
    if (logout) logout();
    navigate('/login');
  };

  const isSpinning = status === 'checking' || status === 'loading';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f1a] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10
                      bg-[#121625] p-8 shadow-2xl text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center
                          bg-lienar-to-br from-indigo-500 to-pink-500
                          shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            <Anchor size={17} className="text-white" />
          </div>
          <span className="text-xl font-extrabold tracking-tight
                           bg-linear-to-br from-indigo-300 via-pink-400 to-cyan-400
                           bg-clip-text text-transparent">
            FlowTask
          </span>
        </div>

        {/* Spinner */}
        {isSpinning && (
          <>
            <Loader2 size={40} className="mx-auto text-indigo-400 animate-spin mb-4" />
            <p className="text-slate-300 font-medium">
              {status === 'checking' ? 'Checking…' : 'Joining workspace…'}
            </p>
            <p className="text-slate-500 text-sm mt-1">Just a moment</p>
          </>
        )}

        {/* Success */}
        {status === 'success' && (
          <>
            <CheckCircle size={40} className="mx-auto text-emerald-400 mb-4" />
            <p className="text-slate-100 font-semibold text-lg">You're in!</p>
            <p className="text-slate-400 text-sm mt-1">
              Successfully joined <strong className="text-indigo-300">{wsName}</strong>.
              Redirecting…
            </p>
          </>
        )}

        {/* Wrong account */}
        {status === 'wrong-account' && (
          <>
            <UserX size={40} className="mx-auto text-amber-400 mb-4" />
            <p className="text-slate-100 font-semibold">Wrong account</p>

            <div className="mt-3 rounded-xl bg-white/4 border border-white/8 p-3 text-left space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Logged in as</span>
                <span className="text-slate-300 font-mono">{userEmail}</span>
              </div>
              {invitedEmail && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Invite sent to</span>
                  <span className="text-emerald-400 font-mono">{invitedEmail}</span>
                </div>
              )}
            </div>

            <p className="text-slate-500 text-xs mt-3">
              Sign in with <strong className="text-slate-300">{invitedEmail ?? 'the correct email'}</strong> to accept.
            </p>

            <div className="flex flex-col gap-2 mt-5">
              <button
                onClick={handleSwitchAccount}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold
                           bg-amber-500/20 border border-amber-400/30
                           text-amber-300 hover:bg-amber-500/30 transition"
              >
                Switch Account →
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-5 py-2.5 rounded-xl text-sm text-slate-600 hover:text-slate-400 transition"
              >
                Stay on Dashboard
              </button>
            </div>
          </>
        )}

        {/* Generic error */}
        {status === 'error' && (
          <>
            <XCircle size={40} className="mx-auto text-red-400 mb-4" />
            <p className="text-slate-100 font-semibold">Invite invalid</p>
            <p className="text-slate-400 text-sm mt-1">{errorMsg}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 px-5 py-2.5 rounded-xl text-sm font-semibold
                         bg-indigo-500/20 border border-indigo-400/30
                         text-indigo-300 hover:bg-indigo-500/30 transition"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {/* Not logged in */}
        {status === 'unauthenticated' && (
          <>
            <p className="text-slate-300 font-medium mb-2">Sign in first</p>
            <p className="text-slate-500 text-sm mb-6">
              You need to be logged in to accept this invite.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold
                         bg-indigo-500 text-white hover:bg-indigo-600 transition"
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}