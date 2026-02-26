import { useCallback } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import { fileToBase64 } from "@/utils/fileToBase64";
import { authHeaders } from "@/api/authApi";
import { addTask, upsertQueue } from "@/lib/idb";

import type { Task } from "@/types/task";

type Props = {
  input: string;
  setInput: (v: string) => void;

  imageFile: File | null;
  setImageFile: (f: File | null) => void;

  activeSectionId: string | null;
  setActiveSectionId: (v: string | null) => void;

  sections: { id: string; title: string }[];
  hasNoSections: boolean;

  tasks: Task[];

  createTask: (text: string, image: string | null, sectionId: string) => Promise<void>;
  deleteTask: (id: string) => void;
  reloadTasks: () => Promise<void>;

  workspace: string;
  userEmail: string | null;
  token: string | null;

  taskInputRef: React.RefObject<HTMLInputElement | null>;
};

export function useTaskActions({
  input,
  setInput,
  imageFile,
  setImageFile,
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
  taskInputRef
}: Props) {

  // ─── ADD TASK ─────────────────────────────────────────────

  const handleAdd = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || hasNoSections) return;

    const targetSectionId = activeSectionId ?? sections[0]?.id ?? null;
    if (!targetSectionId) return;

    let base64: string | null = null;
    if (imageFile) base64 = await fileToBase64(imageFile);

    setInput("");
    setImageFile(null);

    await createTask(trimmed, base64, targetSectionId);

    toast.success("✨ Task added!", {
      description: `"${trimmed}"`,
      duration: 2500,
    });

  }, [
    input,
    imageFile,
    activeSectionId,
    sections,
    hasNoSections,
    createTask
  ]);

  // ─── DELETE TASK ──────────────────────────────────────────

  const handleDelete = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    deleteTask(id);

    toast.success("🧹 Task deleted", {
      description: task ? `"${task.text}"` : "Task removed",
      duration: 2500,
    });

  }, [tasks, deleteTask]);

  // ─── EDIT SAVE ────────────────────────────────────────────

  const handleEditSave = useCallback(
    async (id: string, text: string, image?: string | null) => {
      if (!userEmail) return;

      const updatedTask = {
        id,
        text,
        image: image ?? null,
        userEmail,
        workspaceType: workspace,
        updatedAt: Date.now(),
        dirty: true,
      };

      // IDB update
      await addTask(updatedTask);

      // queue update
      await upsertQueue({
        id: uuidv4(),
        action: "update",
        taskId: id,
        userEmail,
        workspaceType: workspace,
        payload: updatedTask,
        retry: 0,
        nextRetry: Date.now(),
      });

      // try online push
      try {
        if (!token) return;

        await fetch(`http://localhost:4000/tasks/${id}`, {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({ text, image }),
        });
      } catch {
        // offline — queue handles retry
      }

      await reloadTasks();
    },
    [userEmail, workspace, token, reloadTasks]
  );

  // ─── CLICK +ADD INSIDE COLUMN ─────────────────────────────

  const handleTaskAddInSection = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId);

    requestAnimationFrame(() => {
      taskInputRef.current?.focus();
    });

  }, []);

  const handleClearSection = useCallback(() => {
    setActiveSectionId(null);
  }, []);

  const handleCreateFirstSection = useCallback((createSection: (t: string) => void) => {
    createSection("My Tasks");
  }, []);

  return {
    handleAdd,
    handleDelete,
    handleEditSave,
    handleTaskAddInSection,
    handleClearSection,
    handleCreateFirstSection
  };
}