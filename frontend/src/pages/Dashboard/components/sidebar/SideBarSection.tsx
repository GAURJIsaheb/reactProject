import { useState } from "react";
import { Anchor, Moon, Sun, LogOut } from "lucide-react";
import WorkspaceSelector from "./WorkspaceSelector";
import NotificationsBell from "./NotificationsBell";
import InviteModal       from "./InviteModal";
import type { HeaderProps } from "./types";
import { useNavigate } from "react-router-dom";

export default function HeaderSection({
  workspace,
  setWorkspace,
  workspaceOptions,
  onAddWorkspace,
  onDeleteWorkspace,
  isDeletingWorkspace,
  userName,
  theme,
  toggleTheme,
  logout,
  notifications,
  onMarkAllRead,
  onDismissNotification,
}: HeaderProps) {
  const [showInvite, setShowInvite] = useState(false);
  const navigate = useNavigate();
  const currentOption  = workspaceOptions.find((o) => o.value === workspace);
  const currentWsId    = (currentOption as (typeof currentOption & { id?: string }))?.id ?? workspace;
  const currentWsLabel = currentOption?.label ?? workspace;

  return (
    <>
      <header
        className="flex items-center justify-between flex-wrap gap-3 px-5 py-4 mb-7
                   bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl
                   shadow-[0_0_0_1px_rgba(99,102,241,0.1),0_20px_60px_rgba(0,0,0,0.4)]
                   relative z-10"
      >
        <div className="absolute top-0 left-0 right-0 h-px
                        bg-linear-to-r from-transparent via-indigo-500/70 to-transparent
                        rounded-t-2xl" />

        {/* Left — logo + workspace selector */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white
                       bg-linear-to-br from-indigo-500 to-pink-500
                       shadow-[0_0_20px_rgba(99,102,241,0.5)]"
          >
            <Anchor size={16} />
          </div>

          <span
            className="text-lg font-extrabold tracking-tight
                       bg-linear-to-br from-indigo-300 via-pink-400 to-cyan-400
                       bg-clip-text text-transparent"
          >
            FlowTask
          </span>

          <WorkspaceSelector
            workspace={workspace}
            setWorkspace={setWorkspace}
            workspaceOptions={workspaceOptions}
            onAddWorkspace={onAddWorkspace}
            onDeleteWorkspace={onDeleteWorkspace}
            isDeletingWorkspace={isDeletingWorkspace}
            onInvite={() => setShowInvite(true)}
            theme={theme}
          />
        </div>

        {/* Right — user + actions */}
        <div className="flex items-center gap-2">
          {userName && (
            <div className="px-3 py-1.5 rounded-full text-[16px] max-w-40 truncate text-foreground font-mono">
              Hello {userName}
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center
                       bg-background border border-border text-foreground
                       hover:bg-white/20 hover:scale-110 transition"
          >
            {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          <NotificationsBell
            notifications={notifications}
            onMarkAllRead={onMarkAllRead}
            onDismissNotification={onDismissNotification}
          />

          <button onClick={() => navigate("/calendar")}>
            📅
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold
                       bg-red-500/20 border border-red-400/40 text-red-300
                       hover:bg-red-500/30 hover:scale-105 transition"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>

      {/* Invite modal (portal-like, rendered outside header flow) */}
      {showInvite && (
        <InviteModal
          workspaceId={currentWsId}
          workspaceName={currentWsLabel}
          onClose={() => setShowInvite(false)}
        />
      )}
    </>
  );
}
