import { useNavigate }  from "react-router-dom";
import { useCalendar } from "./helpers/useCalendar";
import { CalendarGrid } from "./component/CalendarGrid";
import { DayPanel } from "./component/DayPanel";

export default function CalendarPage() {
  const navigate = useNavigate();
  const cal      = useCalendar();

  return (
    <div className="min-h-screen bg-[#0e0f13] text-[#e8e9f0] relative overflow-hidden pb-12 font-sans">
      {/* Ambient orbs */}
      <div className="fixed -top-36 -left-32 w-130 h-130 rounded-full blur-[90px] pointer-events-none bg-[radial-gradient(circle,rgba(99,102,241,0.18)_0%,transparent_70%)]" />
      <div className="fixed -bottom-28 -right-28 w-105 h-105 rounded-full blur-[90px] pointer-events-none bg-[radial-gradient(circle,rgba(236,72,153,0.12)_0%,transparent_70%)]" />

      <div className="relative z-10 max-w-5xl mx-auto px-5">
        {/* Header */}
        <header className="flex items-center gap-4 py-6 border-b border-white/10 mb-7">
          <button
            onClick={() => navigate(-1)}
            title="Back"
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>

          <div className="flex items-center gap-2 flex-1">
            <span className="text-xl" aria-hidden="true">📅</span>
            <h1 className="text-lg font-bold tracking-tight text-gray-100">Reminder Calendar</h1>
          </div>

          <button
            onClick={cal.goToday}
            className="px-4 py-1.5 text-xs font-semibold rounded-md bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30 transition"
          >
            Today
          </button>
        </header>

        {/* Body */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-6">
          <CalendarGrid
            year={cal.year}
            month={cal.month}
            selectedDay={cal.selectedDay}
            remindersByDay={cal.remindersByDay}
            isToday={cal.isToday}
            onSelectDay={cal.selectDay}
            onPrevMonth={cal.prevMonth}
            onNextMonth={cal.nextMonth}
          />

          <DayPanel
            month={cal.month}
            selectedDay={cal.selectedDay}
            isToday={cal.isToday}
            selectedDayReminders={cal.selectedDayReminders}
            selectedReminder={cal.selectedReminder}
            loading={cal.loading}
            onToggleReminder={cal.toggleReminder}
          />
        </div>
      </div>
    </div>
  );
}