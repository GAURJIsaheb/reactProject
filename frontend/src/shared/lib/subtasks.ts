import type { TaskSubtask } from "@/shared/types/task";

export function normalizeSubtasks(input: unknown): TaskSubtask[] {
  if (!Array.isArray(input)) return [];

  const normalized: TaskSubtask[] = [];

  for (const entry of input) {
    if (normalized.length === 3) break;

    const text = String((entry as { text?: unknown })?.text ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 80);

    if (!text) continue;

    normalized.push({
      id:
        String((entry as { id?: unknown })?.id ?? "").trim() ||
        crypto.randomUUID(),
      text,
      completed: Boolean((entry as { completed?: unknown })?.completed),
    });
  }

  return normalized;
}

export function hasIncompleteSubtasks(subtasks: TaskSubtask[] | null | undefined): boolean {
  return Array.isArray(subtasks) && subtasks.some((subtask) => !subtask.completed);
}

export function cannotCompleteTask(subtasks: TaskSubtask[] | null | undefined): boolean {
  return hasIncompleteSubtasks(subtasks);
}

export function getIncompleteSubtasksMessage() {
  return {
    title: "Subtasks first",
    description: "Finish all subtasks before marking the main task complete.",
  };
}

export function getSubtaskProgressLabel(subtasks: TaskSubtask[] | null | undefined): string | null {
  if (!Array.isArray(subtasks) || subtasks.length === 0) return null;
  const completed = subtasks.filter((subtask) => subtask.completed).length;
  return `${completed}/${subtasks.length} subtasks`;
}
