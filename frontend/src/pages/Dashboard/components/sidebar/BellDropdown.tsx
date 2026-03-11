import { useLayoutEffect, useState } from "react";
import { X } from "lucide-react";
import type { ReminderNotification } from "./types";

type Props = {
  bellRef: React.RefObject<HTMLDivElement | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  notifications: ReminderNotification[];
  onMarkAllRead: () => void;
  onDismissNotification: (n: ReminderNotification) => void;
};

export default function BellDropdown({
  bellRef,
  dropdownRef,
  notifications,
  onMarkAllRead,
  onDismissNotification,
}: Props) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!bellRef.current) return;

    const updatePosition = () => {
      if (!bellRef.current) return;

      const rect = bellRef.current.getBoundingClientRect();
      const dropdownWidth = Math.min(320, window.innerWidth - 24);
      const viewportPadding = 12;
      const idealLeft = rect.left;
      const maxLeft = window.innerWidth - dropdownWidth - viewportPadding;

      setPos({
        top: rect.bottom + 10,
        left: Math.max(viewportPadding, Math.min(idealLeft, maxLeft)),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [bellRef]);

  if (!pos) return null;

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
      }}
      className="w-80 max-w-[85vw] rounded-2xl border border-white/10
      bg-[#121625] shadow-[0_20px_50px_rgba(0,0,0,0.65)] p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12px] font-bold text-foreground">Reminders</p>

        <button
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
              className={`rounded-xl border px-3 py-2 ${n.read
                  ? "border-white/10 bg-white/5 opacity-75"
                  : "border-indigo-400/35 bg-indigo-500/10"
                }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] font-semibold text-slate-100 truncate">
                  {n.taskText}
                </p>

                <button
                  onClick={() => onDismissNotification(n)}
                  className="text-slate-300 hover:text-rose-300"
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
}
