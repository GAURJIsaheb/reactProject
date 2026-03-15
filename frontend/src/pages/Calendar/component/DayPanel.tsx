import { ReminderCard }  from "./ReminderCard";
import { MONTHS }        from "../helpers/calendarUtils";
import type { ReminderEvent } from "../types";

interface Props {
  month:                 number;
  selectedDay:           number | null;
  isToday:               (day: number) => boolean;
  selectedDayReminders:  ReminderEvent[];
  selectedReminder:      ReminderEvent | null;
  loading:               boolean;
  onToggleReminder:      (r: ReminderEvent) => void;
}

export function DayPanel({
  month, selectedDay, isToday,
  selectedDayReminders, selectedReminder,
  loading, onToggleReminder,
}: Props) {
  if (!selectedDay) {
    return (
      <section className="bg-white/5 border border-white/10 rounded-2xl p-5 min-h-80 flex flex-col items-center justify-center gap-2 text-gray-500">
        <span className="text-3xl opacity-50">🗓️</span>
        <p className="text-sm">Select a day to view reminders</p>
      </section>
    );
  }

  return (
    <section className="bg-white/5 border border-white/10 rounded-2xl p-5 min-h-80">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-white/10 pb-3 mb-4">
        <h2 className="font-semibold text-gray-100 flex items-center gap-2">
          {MONTHS[month]} {selectedDay}
          {isToday(selectedDay) && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/25 text-indigo-300 uppercase tracking-wide">
              Today
            </span>
          )}
        </h2>
        <span className="text-xs text-gray-500">
          {selectedDayReminders.length} reminder{selectedDayReminders.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-white/10 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : selectedDayReminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-gray-500">
          <span className="text-2xl opacity-50">🛎️</span>
          <p className="text-sm">No reminders this day</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {selectedDayReminders.map((r) => (
            <ReminderCard
              key={r.id}
              reminder={r}
              isActive={selectedReminder?.id === r.id}
              onToggle={onToggleReminder}
            />
          ))}
        </ul>
      )}
    </section>
  );
}