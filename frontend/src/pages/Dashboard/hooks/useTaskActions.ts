import { useCallback } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import { addTask, upsertQueue } from "@/infrastructure/lib/idb";
import { apiUpdateTask } from "@/api/taskApi";

import type { Task } from "@/shared/types/task";

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

  createTask: (text: string, image: File | null, sectionId: string) => Promise<void>;
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
  taskInputRef,
}: Props) {

  // ─── ADD TASK ─────────────────────────────────────────────

  const handleAdd = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || hasNoSections) return;

    const targetSectionId = activeSectionId ?? sections[0]?.id ?? null;
    if (!targetSectionId) return;

    // Pass raw File — NO base64 conversion
    const fileToUpload = imageFile ?? null;

    setInput("");
    setImageFile(null);

    await createTask(trimmed, fileToUpload, targetSectionId);

    toast.success("✨ Task added!", {
      description: `"${trimmed}"`,
      duration: 2500,
    });

  }, [input, imageFile, activeSectionId, sections, hasNoSections, createTask]);

  // ─── DELETE TASK ──────────────────────────────────────────

  const handleDelete = useCallback((id: string) => {
    const task = tasks.find((t) => t.id === id);
    deleteTask(id);

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
    ) => {
      if (!userEmail) return;

      // IDB optimistic update — clear image if removing, keep existing if no change
      const idbUpdate: any = {
        id,
        text,
        userEmail,
        workspaceType: workspace,
        updatedAt: Date.now(),
        dirty: true,
      };
      if (removeImage) idbUpdate.image = null;

      await addTask(idbUpdate);

      // Queue for offline retry
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

      // Online push via FormData
      try {
        if (!token) return;
        const result = await apiUpdateTask(id, { text }, token, imageFile, removeImage);

        // Update IDB with fresh signed URL from server
        if (result?.task?.imageUrl) {
          await addTask({ id, image: result.task.imageUrl });
        }
      } catch {
        // offline — queue handles it
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

  const handleCreateFirstSection = useCallback(
    (createSection: (t: string) => void) => {
      createSection("My Tasks");
    },
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