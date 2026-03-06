import { useMemo, useState, useEffect, useRef, forwardRef } from "react";
import { Anchor, Moon, Sun, LogOut, Bell, X } from "lucide-react";

export type ReminderNotification = {
  id: string;
  taskId: string;
  taskText: string;
  dueAt: number;
  read: boolean;
  source: "reminder" | "completion";
};

type Props = {
  workspace: string;
  setWorkspace: (v: string) => void;
  userName?: string | null;
  theme: string;
  toggleTheme: () => void;
  logout: () => void;
  notifications: ReminderNotification[];
  onMarkAllRead: () => void;
  onDismissNotification: (n: ReminderNotification) => void;
};

export default function HeaderSection({
  workspace,
  setWorkspace,
  userName,
  theme,
  toggleTheme,
  logout,
  notifications,
  onMarkAllRead,
  onDismissNotification,
}: Props) {
  const [openBell, setOpenBell] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  useEffect(() => {
    if (!openBell) return;
    const handler = (e: MouseEvent) => {
      if (
        bellRef.current &&
        !bellRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpenBell(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openBell]);

  return (
    <>
      <header
        className="flex items-center justify-between flex-wrap gap-3 px-5 py-4 mb-7
        bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl
        shadow-[0_0_0_1px_rgba(99,102,241,0.1),0_20px_60px_rgba(0,0,0,0.4)]
        relative"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-indigo-500/70 to-transparent rounded-t-2xl" />

        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white
            bg-linear-to-br from-indigo-500 to-pink-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]"
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

          <select
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
            className="px-2 py-2 text-[13px] font-semibold rounded-xl
            bg-background border border-border text-foreground outline-none
            hover:bg-muted hover:border-border"
          >
            <option value="personal">🪪 Personal</option>
            <option value="professional">🧑🏻‍💼 Professional</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {userName && (
            <div
              className="px-3 py-1.5 rounded-full text-[16px] max-w-40 truncate
              text-foreground font-mono"
            >
              Hello {userName}
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center
            bg-background border border-border text-foreground
            hover:bg-white/20 hover:scale-110 transition"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          <div ref={bellRef} className="relative">
            <button
              type="button"
              onClick={() => setOpenBell((prev) => !prev)}
              className="w-9 h-9 rounded-xl flex items-center justify-center
              bg-background border border-border text-foreground
              hover:bg-white/20 hover:scale-110 transition relative"
              aria-label="Notifications"
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold bg-rose-500 text-white flex items-center justify-center">
                  {Math.min(unreadCount, 9)}
                </span>
              )}
            </button>
          </div>

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

      {openBell && (
        <BellDropdown
          ref={dropdownRef}
          bellRef={bellRef}
          notifications={notifications}
          onMarkAllRead={onMarkAllRead}
          onDismissNotification={onDismissNotification}
        />
      )}
    </>
  );
}

const BellDropdown = forwardRef<
  HTMLDivElement,
  {
    bellRef: React.RefObject<HTMLDivElement | null>;
    notifications: ReminderNotification[];
    onMarkAllRead: () => void;
    onDismissNotification: (n: ReminderNotification) => void;
  }
>(function BellDropdown(
  { notifications, onMarkAllRead, bellRef, onDismissNotification },
  ref
) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [bellRef]);

  if (!pos) return null;

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: pos.top,
        right: pos.right,
        zIndex: 9999,
      }}
      className="w-80 max-w-[85vw] rounded-2xl border border-white/10 bg-[#121625]
      shadow-[0_20px_50px_rgba(0,0,0,0.65)] p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12px] font-bold text-foreground">Reminders</p>
        <button
          type="button"
          onClick={onMarkAllRead}
          className="text-[11px] text-indigo-300 hover:text-indigo-200"
        >
          Mark all read
        </button>
      </div>

      {notifications.length === 0 ? (
        <p className="text-[12px] text-slate-400 py-4 text-center">
          No reminder notifications yet
        </p>
      ) : (
        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border px-3 py-2 ${
                n.read
                  ? "border-white/10 bg-white/5 opacity-75"
                  : "border-indigo-400/35 bg-indigo-500/10"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] font-semibold text-slate-100 truncate">
                  {n.taskText}
                </p>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  className="shrink-0 text-slate-300 hover:text-rose-300 transition"
                  onClick={() => onDismissNotification(n)}
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                {n.source === "completion" ? "Completed " : "Due "}
                {new Date(n.dueAt).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
