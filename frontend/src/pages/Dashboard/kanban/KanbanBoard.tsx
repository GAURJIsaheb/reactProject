import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useCallback, useState, useEffect } from "react";

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
  onTaskEdit: (task: Task) => void;
  onTaskView: (task: Task) => void;
  onTaskAdd: (sectionId: string) => void;
}

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

  const getTasksForSection = useCallback(
    (sectionId: string) =>
      drag.localTasks.filter((t) => t.sectionId === sectionId && !t.deleted),
    [drag.localTasks]
  );

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
      <div className="kanban-board-scroll flex gap-5 overflow-x-auto pb-6 pt-2 min-h-[60vh]">
        {/* Drive SortableContext from localSections so it reflects live order */}
        <SortableContext
          items={localSections.map((s) => s.id)}
          strategy={horizontalListSortingStrategy}
        >
          {localSections.map((section, idx) => (
            <SortableColumn
              key={section.id}
              section={section}
              tasks={getTasksForSection(section.id)}
              columnIndex={idx}
              onRename={props.onRenameSection}
              onDelete={props.onDeleteSection}
              onTaskDelete={props.onTaskDelete}
              onTaskToggle={handleToggle}
              onTaskEdit={props.onTaskEdit}
              onTaskView={props.onTaskView}
              onTaskAdd={props.onTaskAdd}
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