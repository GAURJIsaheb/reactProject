import { useState, useMemo, useEffect } from "react";
import { useAuthStore }        from "@/zustand/authStore";
import { getAllTasksForUser }   from "@/infrastructure/lib/idb";
import {
  toReminderEvent,
  buildRemindersByDay,
  isSameDay,
} from "./calendarUtils";
import type { ReminderEvent } from "../types";

export function useCalendar() {
  const { userEmail } = useAuthStore();
  const today         = new Date();

  const [year,  setYear]                        = useState(today.getFullYear());
  const [month, setMonth]                       = useState(today.getMonth());
  const [selectedDay, setSelectedDay]           = useState<number | null>(today.getDate());
  const [selectedReminder, setSelectedReminder] = useState<ReminderEvent | null>(null);
  const [reminders, setReminders]               = useState<ReminderEvent[]>([]);
  const [loading, setLoading]                   = useState(true);

  // ── Load all tasks with reminderAt from IDB ──────────────────────────────
  useEffect(() => {
    if (!userEmail) { setReminders([]); setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const tasks  = await getAllTasksForUser(userEmail);
        const events = tasks
          .map(toReminderEvent)
          .filter((e): e is ReminderEvent => e !== null)
          .sort((a, b) => a.dueAt - b.dueAt);
        setReminders(events);
      } finally {
        setLoading(false);
      }
    })();
  }, [userEmail]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const remindersByDay = useMemo(
    () => buildRemindersByDay(reminders, year, month),
    [reminders, year, month],
  );

  const selectedDayReminders = useMemo(() => {
    if (!selectedDay) return [];
    return reminders
      .filter((r) => isSameDay(r.dueAt, year, month, selectedDay))
      .sort((a, b) => a.dueAt - b.dueAt);
  }, [reminders, selectedDay, year, month]);

  // ── Navigation ───────────────────────────────────────────────────────────
  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
    setSelectedDay(null); setSelectedReminder(null);
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
    setSelectedDay(null); setSelectedReminder(null);
  }

  function goToday() {
    setYear(today.getFullYear()); setMonth(today.getMonth());
    setSelectedDay(today.getDate()); setSelectedReminder(null);
  }

  function selectDay(day: number) {
    setSelectedDay(day);
    setSelectedReminder(null);
  }

  function toggleReminder(r: ReminderEvent) {
    setSelectedReminder((prev) => (prev?.id === r.id ? null : r));
  }

  function isToday(day: number) {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  }

  return {
    // state
    year, month, selectedDay, selectedReminder,
    reminders, loading,
    // derived
    remindersByDay, selectedDayReminders,
    // actions
    prevMonth, nextMonth, goToday,
    selectDay, toggleReminder, isToday,
  };
}