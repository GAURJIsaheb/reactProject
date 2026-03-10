import { useCallback } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import { addTask, upsertQueue } from "@/infrastructure/lib/idb";
import { apiUpdateTask } from "@/services/task.service";

import type { Task } from "@/shared/types/task";
import taskAddSound from "@/assests/taskadd.wav";
import taskDeleteSound from "@/assests/deleteTask.wav";

type Props = {
  input: string;
  setInput: (v: string) => void;

  imageFile: File | null;
  setImageFile: (f: File | null) => void;
  reminderDate: string;
  setReminderDate: (v: string) => void;
  reminderTime: string;
  setReminderTime: (v: string) => void;

  activeSectionId: string | null;
  setActiveSectionId: (v: string | null) => void;

  sections: { id: string; title: string }[];
  hasNoSections: boolean;

  tasks: Task[];

  // ← return type is now Task | null (null when collab + offline)
  createTask: (text: string, image: File | null, sectionId: string) => Promise<Task | null>;
  onTaskReminderSet: (taskId: string, taskText: string, dueAt: number | null) => void;
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

export function useTaskActions({
  input,
  setInput,
  imageFile,
  setImageFile,
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
  onTaskReminderSet,
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

  // ─── ADD TASK ─────────────────────────────────────────────
  const handleAdd = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || hasNoSections) return;

    const targetSectionId = activeSectionId ?? sections[0]?.id ?? null;
    if (!targetSectionId) return;

    const reminderAt = resolveReminderAt();
    if (Number.isNaN(reminderAt)) { toast.error("Reminder date and time both required"); return; }
    if (reminderAt !== null && reminderAt <= Date.now()) { toast.error("Reminder time should be in future"); return; }

    setInput("");
    setImageFile(null);
    setReminderDate("");
    setReminderTime("");

    const createdTask = await createTask(trimmed, imageFile ?? null, targetSectionId);
    // createdTask is null when collab workspace + offline — guard before using it
    if (!createdTask) return;

    onTaskReminderSet(createdTask.id, trimmed, reminderAt);
    playSuccessSound();
    toast.success("✨ Task added!", { description: `"${trimmed}"`, duration: 2500 });

  }, [
    input, imageFile, activeSectionId, sections, hasNoSections,
    createTask, reminderDate, reminderTime, resolveReminderAt,
    setInput, setImageFile, setReminderDate, setReminderTime, onTaskReminderSet,
  ]);

  // ─── DELETE TASK ──────────────────────────────────────────
  const handleDelete = useCallback((id: string) => {
    const task = tasks.find((t) => t.id === id);
    deleteTask(id);
    deleteTaskSound();
    toast.success("🧹 Task deleted", {
      description: task ? `"${task.text}"` : "Task removed",
      duration: 2500,
    });
  }, [tasks, deleteTask]);

  // ─── EDIT SAVE ────────────────────────────────────────────
  const handleEditSave = useCallback(
    async (
      id: string,
      text: string,
      imageFile?: File | null,
      removeImage?: boolean
    ): Promise<boolean> => {
      if (!userEmail) return false;

      const idbUpdate: any = {
        id, text, userEmail,
        workspaceType: workspace,
        updatedAt: Date.now(),
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
        payload: { text, ...(removeImage ? { image: null } : {}) },
        retry: 0,
        nextRetry: Date.now(),
      });

      try {
        if (token) {
          const result = await apiUpdateTask(id, { text }, token, imageFile, removeImage);
          if (result?.task?.imageUrl) {
            await addTask({ id, image: result.task.imageUrl });
          }
        }
      } catch { /* offline — queue handles it */ }

      await reloadTasks();
      return true;
    },
    [userEmail, workspace, token, reloadTasks]
  );

  // ─── CLICK +ADD INSIDE COLUMN ─────────────────────────────
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
    handleEditSave,
    handleTaskAddInSection,
    handleClearSection,
    handleCreateFirstSection,
  };
}