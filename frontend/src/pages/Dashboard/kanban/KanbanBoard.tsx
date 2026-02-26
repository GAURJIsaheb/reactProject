import { DndContext, closestCorners, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useCallback, useState } from "react";

import type { Section } from "@/types/section";
import type { Task } from "@/types/task";

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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const drag = useKanbanDrag({
    sections: props.sections,
    tasks: props.tasks,
    token,
    userEmail,
    onSectionsReorder: props.onSectionsReorder,
    onTasksChanged: props.onTasksChanged,
  });

  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());

  const getTasksForSection = useCallback(
    (sectionId: string) =>
      drag.localTasks.filter(t => t.sectionId === sectionId && !t.deleted),
    [drag.localTasks]
  );

  const handleToggle = (id: string, e?: React.MouseEvent) => {
    const task = drag.localTasks.find(t => t.id === id);
    if (task && !task.completed && e) {
      spawnConfetti(e.clientX, e.clientY);
      setJustCompleted(prev => new Set([...prev, id]));
      setTimeout(() => {
        setJustCompleted(prev => {
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
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 min-h-[60vh]">
        <SortableContext
          items={props.sections.map(s => s.id)}
          strategy={horizontalListSortingStrategy}
        >
          {props.sections.map(section => (
            <SortableColumn
              key={section.id}
              section={section}
              tasks={getTasksForSection(section.id)}
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
        activeTask={drag.localTasks.find(t => t.id === drag.activeId)}
        activeSection={props.sections.find(s => s.id === drag.activeId)}
        getTasksForSection={getTasksForSection}
      />
    </DndContext>
  );
}