import { useRef, useState, useEffect, useCallback } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragStartEvent, DragOverEvent, DragEndEvent } from "@dnd-kit/core";
import type { Task } from "@/types/task";
import type { Section } from "@/types/section";

import {
  updateTaskSectionInIDB,
  upsertQueue
} from "@/lib/idb";

import { authHeaders } from "@/api/authApi";
import { v4 as uuidv4 } from "uuid";

export function useKanbanDrag({
  sections,
  tasks,
  token,
  userEmail,
  onSectionsReorder,
  onTasksChanged,
}: {
  sections: Section[];
  tasks: Task[];
  token?: string | null;
  userEmail?: string | null;
  onSectionsReorder: (s: Section[]) => void;
  onTasksChanged: () => void;
}) {

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<"task" | "column" | null>(null);

  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  const dragOriginSectionId = useRef<string | null>(null);
  const isSavingDrag = useRef(false);

  useEffect(() => {
    if (isSavingDrag.current) return;
    setLocalTasks(tasks);
  }, [tasks]);

  // ───── drag start ─────
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    const type = event.active.data.current?.type ?? null;

    setActiveId(id);
    setActiveDragType(type);

    if (type === "task") {
      const task = tasks.find((t) => t.id === id);
      dragOriginSectionId.current = task?.sectionId ?? null;
    }
  }, [tasks]);

  // ───── drag over ─────
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (active.data.current?.type !== "task") return;

    const toSection =
      over.data.current?.type === "column"
        ? (over.id as string)
        : (over.data.current?.sectionId as string);

    if (!toSection) return;

    setLocalTasks(prev =>
      prev.map(t =>
        t.id === active.id ? { ...t, sectionId: toSection } : t
      )
    );
  }, []);

  // ───── drag end ─────
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setActiveDragType(null);
    if (!over) return;

    // column reorder
    if (activeDragType === "column") {
      if (active.id === over.id) return;

      const oldIdx = sections.findIndex(s => s.id === active.id);
      const newIdx = sections.findIndex(s => s.id === over.id);

      if (oldIdx === -1 || newIdx === -1) return;
      onSectionsReorder(arrayMove(sections, oldIdx, newIdx));
      return;
    }

    // task move
    if (activeDragType === "task") {
      const taskId = String(active.id);
      const movedTask = localTasks.find(t => t.id === taskId);
      if (!movedTask) return;

      const targetSectionId =
        over.data.current?.type === "column"
          ? String(over.id)
          : (over.data.current?.sectionId as string) ?? movedTask.sectionId;

      const originalSectionId = dragOriginSectionId.current;
      const isCross = originalSectionId && originalSectionId !== targetSectionId;

      if (isCross) {
        isSavingDrag.current = true;

        try {
          await updateTaskSectionInIDB(taskId, targetSectionId);

          const payload = { sectionId: targetSectionId, updatedAt: Date.now() };

          await upsertQueue({
            id: uuidv4(),
            action: "update",
            taskId,
            userEmail: userEmail ?? "",
            workspaceType: movedTask.workspaceType,
            payload,
            retry: 0,
            nextRetry: Date.now(),
          });

          if (token) {
            fetch(`http://localhost:4000/tasks/${taskId}`, {
              method: "PUT",
              headers: authHeaders(token),
              body: JSON.stringify(payload),
            }).catch(() => {});
          }

          onTasksChanged();
        } finally {
          requestAnimationFrame(() => {
            isSavingDrag.current = false;
          });
        }
      }

      dragOriginSectionId.current = null;
    }
  }, [
    activeDragType,
    sections,
    localTasks,
    token,
    userEmail,
    onSectionsReorder,
    onTasksChanged,
  ]);

  return {
    activeId,
    activeDragType,
    localTasks,
    setLocalTasks,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}