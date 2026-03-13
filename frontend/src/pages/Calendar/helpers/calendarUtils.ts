import type { Task }          from "@/shared/types/task";
import type { ReminderEvent } from "../types";

export const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
] as const;

export const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] as const;

export function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function isSameDay(ts: number, year: number, month: number, day: number) {
  const d = new Date(ts);
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatFullDate(ts: number) {
  return new Date(ts).toLocaleDateString([], {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

export function getReminderStatus(reminder: ReminderEvent): string {
  if (reminder.completed)          return "Completed";
  if (reminder.dueAt <= Date.now()) return "Due";
  return "Upcoming";
}

export function toReminderEvent(task: Task): ReminderEvent | null {
  if (typeof (task as any).reminderAt !== "number") return null;
  return {
    id:        `reminder:${task.id}`,
    taskId:    task.id,
    taskText:  task.text,
    dueAt:     (task as any).reminderAt as number,
    workspace: task.workspaceType ?? "personal",
    completed: task.completed,
  };
}

export function buildRemindersByDay(
  reminders: ReminderEvent[],
  year:      number,
  month:     number,
): Map<number, ReminderEvent[]> {
  const map = new Map<number, ReminderEvent[]>();
  for (const r of reminders) {
    const d = new Date(r.dueAt);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const day = d.getDate();
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(r);
  }
  return map;
}