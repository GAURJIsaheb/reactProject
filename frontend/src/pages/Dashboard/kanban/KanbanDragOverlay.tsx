import { DragOverlay } from "@dnd-kit/core";
import TaskCard from "@/features/tasks/ui/TaskCard";
import type { Task } from "@/shared/types/task";
import type { Section } from "@/shared/types/section";

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
    <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}>
      {/* ── Task drag ghost ── */}
      {activeId && activeType === "task" && activeTask && (
        <div
          className="
            rotate-[1.5deg] scale-[1.03] pointer-events-none
            shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(139,92,246,0.25)]
            rounded-xl ring-1 ring-violet-500/20
          "
        >
          <TaskCard
            task={activeTask}
            index={0}
            onDelete={() => {}}
            onToggle={() => {}}
            onView={() => {}}
          />
        </div>
      )}

      {/* ── Column drag ghost ── */}
      {activeId && activeType === "column" && activeSection && (
        <div
          className="
            pointer-events-none w-75 rounded-2xl
            bg-[#1a1a28] border border-violet-500/20
            shadow-[0_24px_64px_rgba(0,0,0,0.6),0_0_0_1px_rgba(139,92,246,0.15)]
            rotate-[0.75deg] scale-[1.02]
          "
        >
          {/* Column header */}
          <div className="flex items-center gap-2 px-3.5 py-3 border-b border-white/6">
            <span className="flex-1 text-sm font-semibold text-slate-200 truncate">
              {activeSection.title}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/6 text-slate-500">
              {getTasksForSection(activeSection.id).length}
            </span>
          </div>

          {/* Task previews */}
          <div className="p-2.5 space-y-2">
            {getTasksForSection(activeSection.id)
              .slice(0, 3)
              .map((t) => (
                <div
                  key={t.id}
                  className="
                    h-10 rounded-xl bg-white/3 border border-white/5
                    px-3 flex items-center
                    text-[12px] text-slate-500 truncate
                  "
                >
                  {t.text}
                </div>
              ))}

            {getTasksForSection(activeSection.id).length > 3 && (
              <div className="text-center text-[11px] text-slate-700 py-1">
                +{getTasksForSection(activeSection.id).length - 3} more
              </div>
            )}
          </div>
        </div>
      )}
    </DragOverlay>
  );
}
