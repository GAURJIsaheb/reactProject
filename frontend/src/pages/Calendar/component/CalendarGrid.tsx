import { MONTHS, DAYS, getDaysInMonth, getFirstDayOfMonth } from "../helpers/calendarUtils";
import type{ ReminderEvent } from "../types";

interface Props {
  year:            number;
  month:           number;
  selectedDay:     number | null;
  remindersByDay:  Map<number, ReminderEvent[]>;
  isToday:         (day: number) => boolean;
  onSelectDay:     (day: number) => void;
  onPrevMonth:     () => void;
  onNextMonth:     () => void;
}

export function CalendarGrid({
  year, month, selectedDay, remindersByDay,
  isToday, onSelectDay, onPrevMonth, onNextMonth,
}: Props) {
  const daysInMonth     = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  const totalCells      = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;

  return (
    <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 transition"
          aria-label="Previous month"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>

        <span className="font-semibold text-gray-100 text-sm">
          {MONTHS[month]} {year}
        </span>

        <button
          onClick={onNextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 transition"
          aria-label="Next month"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 text-[10px] text-gray-500 mb-1">
        {DAYS.map((d) => (
          <span key={d} className="text-center uppercase tracking-wide">{d}</span>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: totalCells }).map((_, idx) => {
          const day   = idx - firstDayOfMonth + 1;
          const valid = day >= 1 && day <= daysInMonth;
          const dots  = valid ? remindersByDay.get(day) ?? [] : [];
          const sel   = valid && selectedDay === day;
          const tod   = valid && isToday(day);

          return (
            <button
              key={idx}
              disabled={!valid}
              onClick={() => valid && onSelectDay(day)}
              className={[
                "aspect-square flex flex-col items-center pt-1 rounded-lg text-sm transition",
                !valid ? "opacity-0 pointer-events-none" : "hover:bg-white/10",
                sel    ? "bg-indigo-500/20 border border-indigo-500/40" : "border border-transparent",
              ].join(" ")}
            >
              {valid && (
                <span className={[
                  "w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium",
                  tod ? "bg-indigo-500 text-white" : "text-gray-300",
                ].join(" ")}>
                  {day}
                </span>
              )}

              {dots.length > 0 && (
                <div className="flex gap-0.5 mt-0.5 items-center">
                  {dots.slice(0, 3).map((r, i) => (
                    <span
                      key={i}
                      className={`w-1 h-1 rounded-full ${r.completed ? "bg-emerald-400" : "bg-pink-400"}`}
                    />
                  ))}
                  {dots.length > 3 && (
                    <span className="text-[8px] text-gray-500 leading-none">+{dots.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 pt-3 border-t border-white/5">
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-pink-400 inline-block" /> Upcoming
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Completed
        </span>
      </div>
    </section>
  );
}