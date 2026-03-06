import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useCallback, useState, useEffect, useMemo } from "react";

import type { Section } from "@/shared/types/section";
import type { Task } from "@/shared/types/task";

import { SortableColumn } from "./KanbanColumn";
import { useAuthStore } from "@/zustand/authStore";

import { spawnConfetti } from "./kanbanConfetti";
import { useKanbanDrag } from "./useKanbanDrag";
import KanbanAddSection from "./KanbanAddSection";
import KanbanDragOverlay from "./KanbanDragOverlay";

interface Props {
  sections: Section[];
  tasks: Task[];
  onSectionsReorder: (sections: Section[]) => void;
  onCreateSection: (title: string) => void;
  onRenameSection: (id: string, title: string) => void;
  onDeleteSection: (id: string) => void;
  onTasksChanged: () => void;
  onTaskDelete: (id: string) => void;
  onTaskToggle: (id: string) => void;
  onTaskView: (task: Task) => void;
  onTaskAdd: (sectionId: string) => void;
  getReminderLabel?: (taskId: string) => string | null;
}

const SECTIONS_PER_PAGE = 12;

export default function KanbanBoard(props: Props) {
  const { token, userEmail } = useAuthStore();

  // ── Local sections state so column reorder doesn't snap back ──
  // This is the single source of truth for section order in the UI.
  const [localSections, setLocalSections] = useState<Section[]>(props.sections);

  // Sync from parent only when sections are added/removed/renamed,
  // NOT during a drag (the drag hook manages order via onSectionsReorder).
  useEffect(() => {
    setLocalSections(props.sections);
  }, [props.sections]);

  const [page, setPage] = useState(0);

  useEffect(() => {
    const lastPage = Math.max(0, Math.ceil(localSections.length / SECTIONS_PER_PAGE) - 1);
    if (page > lastPage) setPage(lastPage);
  }, [localSections.length, page]);

  // When the drag hook finishes a column reorder it calls this,
  // which updates local state immediately (no snap-back) and also
  // persists to the engine via props.onSectionsReorder.
  const handleSectionsReorder = useCallback(
    (reordered: Section[]) => {
      setLocalSections(reordered);         // instant UI update
      props.onSectionsReorder(reordered);  // persist to engine / backend
    },
    [props.onSectionsReorder]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // IMPORTANT: pass localSections (not props.sections) so the hook's
  // sectionsRef always reflects the current rendered order.
  const drag = useKanbanDrag({
    sections: localSections,
    tasks: props.tasks,
    token,
    userEmail,
    onSectionsReorder: handleSectionsReorder,
    onTasksChanged: props.onTasksChanged,
  });

  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());

  const tasksBySection = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of drag.localTasks) {
      if (task.deleted || !task.sectionId) continue;
      const bucket = map.get(task.sectionId);
      if (bucket) bucket.push(task);
      else map.set(task.sectionId, [task]);
    }
    return map;
  }, [drag.localTasks]);

  const getTasksForSection = useCallback(
    (sectionId: string) => tasksBySection.get(sectionId) ?? [],
    [tasksBySection]
  );

  const totalPages = Math.max(1, Math.ceil(localSections.length / SECTIONS_PER_PAGE));
  const start = page * SECTIONS_PER_PAGE;
  const end = start + SECTIONS_PER_PAGE;
  const visibleSections = localSections.slice(start, end);

  const handleToggle = (id: string, e?: React.MouseEvent) => {
    const task = drag.localTasks.find((t) => t.id === id);
    if (task && !task.completed && e) {
      spawnConfetti(e.clientX, e.clientY);
      setJustCompleted((prev) => new Set([...prev, id]));
      setTimeout(() => {
        setJustCompleted((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      }, 900);
    }
    props.onTaskToggle(id);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={drag.handleDragStart}
      onDragOver={drag.handleDragOver}
      onDragEnd={drag.handleDragEnd}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground">
          Showing sections {localSections.length === 0 ? 0 : start + 1}-
          {Math.min(end, localSections.length)} of {localSections.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs tabular-nums text-muted-foreground">
            {page + 1}/{totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <div className="kanban-board-scroll flex gap-5 overflow-x-auto pb-6 pt-2 min-h-[60vh]">
        {/* Drive SortableContext from localSections so it reflects live order */}
        <SortableContext
          items={visibleSections.map((s) => s.id)}
          strategy={horizontalListSortingStrategy}
        >
          {visibleSections.map((section, idx) => (
            <SortableColumn
              key={section.id}
              section={section}
              tasks={getTasksForSection(section.id)}
              columnIndex={start + idx}
              onRename={props.onRenameSection}
              onDelete={props.onDeleteSection}
              onTaskDelete={props.onTaskDelete}
              onTaskToggle={handleToggle}
              onTaskView={props.onTaskView}
              onTaskAdd={props.onTaskAdd}
              getReminderLabel={props.getReminderLabel}
              justCompleted={justCompleted}
            />
          ))}
        </SortableContext>

        <KanbanAddSection onCreate={props.onCreateSection} />
      </div>

      <KanbanDragOverlay
        activeId={drag.activeId}
        activeType={drag.activeDragType}
        activeTask={drag.localTasks.find((t) => t.id === drag.activeId)}
        activeSection={localSections.find((s) => s.id === drag.activeId)}
        getTasksForSection={getTasksForSection}
      />
    </DndContext>
  );
}
