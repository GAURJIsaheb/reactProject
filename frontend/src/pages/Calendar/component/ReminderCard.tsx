import { formatTime, formatFullDate, getReminderStatus } from "../helpers/calendarUtils";
import type { ReminderEvent } from "../types";

interface Props {
  reminder:         ReminderEvent;
  isActive:         boolean;
  onToggle:         (r: ReminderEvent) => void;
}

export function ReminderCard({ reminder, isActive, onToggle }: Props) {
  const wsEmoji =
    reminder.workspace === "personal"     ? "🪪"  :
    reminder.workspace === "professional" ? "🧑🏻‍💼" : "🌎";

  return (
    <li
      onClick={() => onToggle(reminder)}
      className={[
        "p-3 rounded-xl border cursor-pointer transition select-none",
        isActive
          ? "border-indigo-500/50 bg-indigo-500/10"
          : "border-white/10 bg-white/5 hover:bg-white/10",
      ].join(" ")}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-indigo-300 tabular-nums">
          {formatTime(reminder.dueAt)}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/6 text-gray-400 capitalize">
          {wsEmoji} {reminder.workspace}
        </span>
      </div>

      {/* Task text */}
      <p className="text-sm text-gray-200 leading-snug line-clamp-2">
        {reminder.taskText}
      </p>

      {/* Expanded detail */}
      {isActive && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5 text-xs text-gray-400">
          <div className="flex justify-between">
            <span>Full date</span>
            <span className="text-gray-300">{formatFullDate(reminder.dueAt)}</span>
          </div>
          <div className="flex justify-between">
            <span>Workspace</span>
            <span className="text-gray-300 capitalize">{reminder.workspace}</span>
          </div>
          <div className="flex justify-between">
            <span>Status</span>
            <span className={
              reminder.completed              ? "text-emerald-400" :
              reminder.dueAt <= Date.now()    ? "text-amber-400"   :
                                               "text-pink-400"
            }>
              {getReminderStatus(reminder)}
            </span>
          </div>
        </div>
      )}
    </li>
  );
}