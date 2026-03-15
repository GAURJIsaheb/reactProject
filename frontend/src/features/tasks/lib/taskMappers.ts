import type{ Task ,TaskSubtask } from "@/shared/types/task";

export function normalizeLabelsInput(value: string): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];

  for (const part of value.split(",")) {
    const label = part.trim().replace(/\s+/g, " ").slice(0, 24);
    if (!label) continue;

    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);

    if (labels.length === 3) break;
  }

  return labels;
}

export function buildOptimisticTask(
  task: Task,
  overrides: Partial<Task> | undefined,
  fallbackVersion?: number
): Task {
  return {
    ...task,
    ...overrides,
    id: task.id,
    labels: overrides?.labels ?? task.labels,
    subtasks: overrides?.subtasks ?? task.subtasks,
    image: overrides?.image ?? task.image,
    imageUrl: overrides?.imageUrl ?? task.imageUrl ?? null,
    imageUrlExpiry: overrides?.imageUrlExpiry ?? task.imageUrlExpiry ?? null,
    syncStatus: "synced",
    dirty: false,
    version: overrides?.version ?? fallbackVersion ?? task.version ?? 1,
  };
}

export function normalizeDraftSubtasks(subtasks: Pick<TaskSubtask, "text">[] = []) {
  return subtasks
    .map((subtask) => subtask.text.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((subtaskText) => ({
      id: crypto.randomUUID(),
      text: subtaskText,
      completed: false,
    }));
}

