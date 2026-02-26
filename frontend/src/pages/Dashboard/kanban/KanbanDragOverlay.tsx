import { DragOverlay } from "@dnd-kit/core";
import TaskCard from "@/components/tasks/TaskCard";
import type { Task } from "@/types/task";
import type { Section } from "@/types/section";

export default function KanbanDragOverlay({
  activeId,
  activeType,
  activeTask,
  activeSection,
  getTasksForSection,
}: {
  activeId: string | null;
  activeType: "task" | "column" | null;
  activeTask?: Task;
  activeSection?: Section;
  getTasksForSection: (id: string) => Task[];
}) {
  return (
    <DragOverlay>
      {activeId && activeType === "task" && activeTask && (
        <div className="rotate-1 scale-105 opacity-95 pointer-events-none">
          <TaskCard
            task={activeTask}
            index={0}
            onDelete={() => {}}
            onToggle={() => {}}
            onEdit={() => {}}
            onView={() => {}}
          />
        </div>
      )}

      {activeId && activeType === "column" && activeSection && (
        <div className="pointer-events-none w-80 rounded-2xl bg-card border-2 shadow-xl">
          <div className="px-4 py-3 border-b font-semibold">{activeSection.title}</div>
          <div className="p-3 space-y-2">
            {getTasksForSection(activeSection.id).slice(0, 4).map(t => (
              <div key={t.id} className="h-9 rounded-xl bg-background border px-3 flex items-center text-xs">
                {t.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </DragOverlay>
  );
}