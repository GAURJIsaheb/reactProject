import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import BellDropdown from "./BellDropdown";
import type { ReminderNotification } from "./types";

type Props = {
  notifications: ReminderNotification[];
  onMarkAllRead: () => void;
  onDismissNotification: (n: ReminderNotification) => void;
};

export default function NotificationsBell({
  notifications,
  onMarkAllRead,
  onDismissNotification,
}: Props) {
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (bellRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <>
      <div ref={bellRef} className="relative">
        <button
          onClick={() => setOpen((p) => !p)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="w-9 h-9 rounded-xl flex items-center justify-center
          bg-background border border-border text-foreground"
        >
          <Bell size={15} />

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold bg-rose-500 text-white flex items-center justify-center">
              {Math.min(unreadCount, 9)}
            </span>
          )}
        </button>
      </div>

      {open && (
        <BellDropdown
          bellRef={bellRef}
          dropdownRef={dropdownRef}
          notifications={notifications}
          onMarkAllRead={onMarkAllRead}
          onDismissNotification={onDismissNotification}
        />
      )}
    </>
  );
}
