import { useRef, useState, useEffect, useCallback } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragStartEvent, DragOverEvent, DragEndEvent } from "@dnd-kit/core";
import type { Task } from "@/shared/types/task";
import type { Section } from "@/shared/types/section";

import { updateTaskSectionInIDB, upsertQueue } from "@/infrastructure/lib/idb";
import { authHeaders } from "@/services/auth.service";
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

  const activeDragTypeRef = useRef<"task" | "column" | null>(null);
  const localTasksRef = useRef<Task[]>(localTasks);
  const dragOriginSectionId = useRef<string | null>(null);
  const isSavingDrag = useRef(false);

  // Assign inline on every render — this is intentional.
  // useEffect would be one render late, meaning sectionsRef could be stale
  // at the moment handleDragEnd fires. Inline assignment guarantees it's
  // always the value from the most recent render before the handler runs.
  const sectionsRef = useRef<Section[]>(sections);
  sectionsRef.current = sections;

  useEffect(() => {
    localTasksRef.current = localTasks;
  }, [localTasks]);

  useEffect(() => {
    if (isSavingDrag.current) return;
    setLocalTasks(tasks);
  }, [tasks]);

  // ───── drag start ─────
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    const type = (event.active.data.current?.type ?? null) as "task" | "column" | null;

    setActiveId(id);
    setActiveDragType(type);
    activeDragTypeRef.current = type;

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
      prev.map(t => t.id === active.id ? { ...t, sectionId: toSection } : t)
    );
  }, []);

  // ───── drag end ─────
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    const dragType = activeDragTypeRef.current;

    setActiveId(null);
    setActiveDragType(null);
    activeDragTypeRef.current = null;

    if (!over) return;

    // ── Column reorder ──
    if (dragType === "column") {
      const activeSectionId = String(active.id);
      const overType = over.data.current?.type;
      const targetSectionId =
        overType === "column"
          ? String(over.id)
          : (over.data.current?.sectionId as string | undefined);

      if (!targetSectionId || activeSectionId === targetSectionId) return;

      // sectionsRef.current is always the latest localSections from KanbanBoard
      // because we assign it inline on every render (not via useEffect)
      const currentSections = sectionsRef.current;
      const oldIdx = currentSections.findIndex(s => s.id === activeSectionId);
      const newIdx = currentSections.findIndex(s => s.id === targetSectionId);

      if (oldIdx === -1 || newIdx === -1) return;

      // onSectionsReorder → KanbanBoard.handleSectionsReorder →
      //   setLocalSections (instant) + props.onSectionsReorder (persist)
      onSectionsReorder(arrayMove(currentSections, oldIdx, newIdx));
      return;
    }

    // ── Task move ──
    if (dragType === "task") {
      const taskId = String(active.id);
      const currentTasks = localTasksRef.current;
      const movedTask = currentTasks.find(t => t.id === taskId);
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
          requestAnimationFrame(() => { isSavingDrag.current = false; });
        }
      }

      dragOriginSectionId.current = null;
    }
  }, [onSectionsReorder, onTasksChanged, token, userEmail]);

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
