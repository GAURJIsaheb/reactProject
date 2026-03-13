import { useCallback } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import { addTask, upsertQueue } from "@/infrastructure/lib/idb";
import { apiUpdateTask } from "@/services/task.service";

import type { Task } from "@/shared/types/task";
import type { TaskSubtask } from "@/shared/types/task";
import { hasIncompleteSubtasks, normalizeSubtasks } from "@/shared/lib/subtasks";
import taskAddSound from "@/assests/taskadd.wav";
import taskDeleteSound from "@/assests/deleteTask.wav";

type Props = {
  input: string;
  setInput: (v: string) => void;

  imageFile: File | null;
  setImageFile: (f: File | null) => void;
  labelsInput: string;
  setLabelsInput: (v: string) => void;
  reminderDate: string;
  setReminderDate: (v: string) => void;
  reminderTime: string;
  setReminderTime: (v: string) => void;

  activeSectionId: string | null;
  setActiveSectionId: (v: string | null) => void;

  sections: { id: string; title: string }[];
  hasNoSections: boolean;

  tasks: Task[];

  createTask: (
    text: string,
    image: File | null,
    sectionId: string,
    reminderAt?: number | null,
    labels?: string[],
    subtasks?: Pick<TaskSubtask, "text">[]
  ) => Promise<Task | null>;
  deleteTask: (id: string) => void;
  reloadTasks: () => Promise<void>;

  workspace: string;
  userEmail: string | null;
  token: string | null;

  taskInputRef: React.RefObject<HTMLInputElement | null>;
};

function playSuccessSound() {
  try { new Audio(taskAddSound).play(); } catch { /* silent */ }
}

function deleteTaskSound() {
  try { new Audio(taskDeleteSound).play(); } catch { /* silent */ }
}

function normalizeLabelsInput(value: string): string[] {
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

export function useTaskActions({
  input,
  setInput,
  imageFile,
  setImageFile,
  labelsInput,
  setLabelsInput,
  reminderDate,
  setReminderDate,
  reminderTime,
  setReminderTime,
  activeSectionId,
  setActiveSectionId,
  sections,
  hasNoSections,
  tasks,
  createTask,
  deleteTask,
  reloadTasks,
  workspace,
  userEmail,
  token,
  taskInputRef,
}: Props) {
  const resolveReminderAt = useCallback((): number | null => {
    if (!reminderDate && !reminderTime) return null;
    if (!reminderDate || !reminderTime) return NaN;
    const dueAt = new Date(`${reminderDate}T${reminderTime}:00`).getTime();
    return Number.isFinite(dueAt) ? dueAt : NaN;
  }, [reminderDate, reminderTime]);

  const handleAdd = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || hasNoSections) return;

    const targetSectionId = activeSectionId ?? sections[0]?.id ?? null;
    if (!targetSectionId) return;
    const labels = normalizeLabelsInput(labelsInput);
    if (labelsInput.trim() && labels.length === 0) {
      toast.error("Enter valid labels separated by commas");
      return;
    }

    const reminderAt = resolveReminderAt();
    if (Number.isNaN(reminderAt)) {
      toast.error("Reminder date and time both required");
      return;
    }
    if (reminderAt !== null && reminderAt <= Date.now()) {
      toast.error("Reminder time should be in future");
      return;
    }

    setInput("");
    setImageFile(null);
    setLabelsInput("");
    setReminderDate("");
    setReminderTime("");

    const createdTask = await createTask(
      trimmed,
      imageFile ?? null,
      targetSectionId,
      reminderAt,
      labels
    );
    if (!createdTask) return;

    playSuccessSound();
    toast.success("Task added", { description: `"${trimmed}"`, duration: 2500 });
  }, [
    input,
    hasNoSections,
    activeSectionId,
    sections,
    resolveReminderAt,
    setInput,
    setImageFile,
    labelsInput,
    setLabelsInput,
    setReminderDate,
    setReminderTime,
    createTask,
    imageFile,
  ]);

  const handleDelete = useCallback((id: string) => {
    const task = tasks.find((t) => t.id === id);
    deleteTask(id);
    deleteTaskSound();
    toast.success("Task deleted", {
      description: task ? `"${task.text}"` : "Task removed",
      duration: 2500,
    });
  }, [tasks, deleteTask]);

  const handleAddFromSpeech = useCallback(async (spokenText: string) => {
    if (hasNoSections) return null;
    const trimmed = spokenText.trim();
    if (!trimmed) {
      toast.error("No speech detected. Please try again.");
      return null;
    }

    const targetSectionId = activeSectionId ?? sections[0]?.id ?? null;
    if (!targetSectionId) return null;

    const labels = normalizeLabelsInput(labelsInput);
    if (labelsInput.trim() && labels.length === 0) {
      toast.error("Enter valid labels separated by commas");
      return null;
    }

    const reminderAt = resolveReminderAt();
    if (Number.isNaN(reminderAt)) {
      toast.error("Reminder date and time both required");
      return null;
    }
    if (reminderAt !== null && reminderAt <= Date.now()) {
      toast.error("Reminder time should be in future");
      return null;
    }

    setInput(trimmed);
    const createdTask = await createTask(
      trimmed,
      null,
      targetSectionId,
      reminderAt,
      labels
    );
    if (!createdTask) return null;

    setInput("");
    setImageFile(null);
    setLabelsInput("");
    setReminderDate("");
    setReminderTime("");

    playSuccessSound();
    toast.success("Task added", { description: `"${createdTask.text}"`, duration: 2500 });
    return createdTask;
  }, [
    hasNoSections,
    activeSectionId,
    sections,
    labelsInput,
    resolveReminderAt,
    createTask,
    setInput,
    setImageFile,
    setLabelsInput,
    setReminderDate,
    setReminderTime,
  ]);

  const handleEditSave = useCallback(
    async (
      id: string,
      text: string,
      labels: string[],
      subtasks: TaskSubtask[],
      imageFile?: File | null,
      removeImage?: boolean,
      reminderAt?: number | null
    ): Promise<boolean> => {
      if (!userEmail) return false;
      const existingTask = tasks.find((task) => task.id === id) ?? null;
      const shouldForceIncomplete = hasIncompleteSubtasks(subtasks);

      const idbUpdate: Partial<Task> = {
        id,
        text,
        userEmail,
        workspaceType: workspace,
        updatedAt: Date.now(),
        labels,
        subtasks,
        reminderAt,
        completed: shouldForceIncomplete ? false : existingTask?.completed,
        dirty: true,
      };
      if (removeImage) idbUpdate.image = null;
      await addTask(idbUpdate);

      await upsertQueue({
        id: uuidv4(),
        action: "update",
        taskId: id,
        userEmail,
        workspaceType: workspace,
        payload: {
          text,
          labels,
          subtasks,
          reminderAt,
          ...(shouldForceIncomplete ? { completed: false } : {}),
          ...(removeImage ? { image: null } : {}),
        },
        retry: 0,
        nextRetry: Date.now(),
      });

      try {
        if (token) {
          const result = await apiUpdateTask(
            id,
            {
              text,
              labels: JSON.stringify(labels),
              subtasks: JSON.stringify(subtasks),
              reminderAt,
              ...(shouldForceIncomplete ? { completed: false } : {}),
            },
            token,
            imageFile,
            removeImage
          );
          await addTask({
            id,
            text: result?.task?.text ?? text,
            labels: result?.task?.labels ?? labels,
            subtasks: normalizeSubtasks(result?.task?.subtasks ?? subtasks),
            image: result?.task?.imageUrl ?? result?.task?.image ?? idbUpdate.image ?? null,
            imageUrl: result?.task?.imageUrl ?? null,
            imageUrlExpiry: result?.task?.imageUrlExpiry ?? null,
            reminderAt: result?.task?.reminderAt ?? reminderAt ?? null,
            completed: result?.task?.completed ?? idbUpdate.completed ?? false,
            updatedAt: result?.task?.updatedAt ?? Date.now(),
            dirty: false,
            syncStatus: "synced",
            version: result?.task?.version ?? 1,
          });
        }
      } catch {
        /* offline - queue handles it */
      }

      await reloadTasks();
      return true;
    },
    [reloadTasks, tasks, token, userEmail, workspace]
  );

  const handleTaskAddInSection = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId);
    requestAnimationFrame(() => { taskInputRef.current?.focus(); });
  }, [setActiveSectionId, taskInputRef]);

  const handleClearSection = useCallback(() => { setActiveSectionId(null); }, [setActiveSectionId]);

  const handleCreateFirstSection = useCallback(
    (createSection: (t: string) => void) => { createSection("My Tasks"); },
    []
  );

  return {
    handleAdd,
    handleDelete,
    handleAddFromSpeech,
    handleEditSave,
    handleTaskAddInSection,
    handleClearSection,
    handleCreateFirstSection,
  };
}
