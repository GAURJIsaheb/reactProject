import { useEffect, useState, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, Check, X, Plus, Sparkles } from "lucide-react";
import type { Section } from "@/shared/types/section";
import type { Task } from "@/shared/types/task";
import TaskCard from "@/features/tasks/ui/TaskCard";

// ─── Per-column accent palette ────────────────────────────────────────────────

const COLUMN_ACCENTS = [
  { dot: "#a78bfa", glowD: "rgba(139,92,246,0.18)", glowL: "rgba(139,92,246,0.07)", borderD: "rgba(139,92,246,0.30)", borderL: "rgba(139,92,246,0.22)", badgeBgD: "rgba(139,92,246,0.15)", badgeBgL: "rgba(139,92,246,0.10)", badgeTextD: "#c4b5fd", badgeTextL: "#6d28d9" },
  { dot: "#60a5fa", glowD: "rgba(59,130,246,0.18)",  glowL: "rgba(59,130,246,0.07)",  borderD: "rgba(59,130,246,0.30)",  borderL: "rgba(59,130,246,0.22)",  badgeBgD: "rgba(59,130,246,0.15)",  badgeBgL: "rgba(59,130,246,0.10)",  badgeTextD: "#93c5fd",  badgeTextL: "#1d4ed8" },
  { dot: "#34d399", glowD: "rgba(16,185,129,0.18)",  glowL: "rgba(16,185,129,0.07)",  borderD: "rgba(16,185,129,0.30)",  borderL: "rgba(16,185,129,0.22)",  badgeBgD: "rgba(16,185,129,0.15)",  badgeBgL: "rgba(16,185,129,0.10)",  badgeTextD: "#6ee7b7",  badgeTextL: "#065f46" },
  { dot: "#fbbf24", glowD: "rgba(245,158,11,0.18)",  glowL: "rgba(245,158,11,0.07)",  borderD: "rgba(245,158,11,0.30)",  borderL: "rgba(245,158,11,0.22)",  badgeBgD: "rgba(245,158,11,0.15)",  badgeBgL: "rgba(245,158,11,0.10)",  badgeTextD: "#fde68a",  badgeTextL: "#92400e" },
  { dot: "#f472b6", glowD: "rgba(236,72,153,0.18)",  glowL: "rgba(236,72,153,0.07)",  borderD: "rgba(236,72,153,0.30)",  borderL: "rgba(236,72,153,0.22)",  badgeBgD: "rgba(236,72,153,0.15)",  badgeBgL: "rgba(236,72,153,0.10)",  badgeTextD: "#fbcfe8",  badgeTextL: "#9d174d" },
  { dot: "#2dd4bf", glowD: "rgba(20,184,166,0.18)",  glowL: "rgba(20,184,166,0.07)",  borderD: "rgba(20,184,166,0.30)",  borderL: "rgba(20,184,166,0.22)",  badgeBgD: "rgba(20,184,166,0.15)",  badgeBgL: "rgba(20,184,166,0.10)",  badgeTextD: "#99f6e4",  badgeTextL: "#134e4a" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  section: Section;
  tasks: Task[];
  columnIndex?: number;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onTaskDelete: (id: string) => void;
  onTaskToggle: (id: string, e?: React.MouseEvent) => void;
  onTaskView: (task: Task) => void;
  onTaskAdd: (sectionId: string) => void;
  getReminderLabel?: (taskId: string) => string | null;
  justCompleted?: Set<string>;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
}

const TASKS_PAGE_SIZE = 120;

// ─── SortableColumn wrapper ───────────────────────────────────────────────────

export function SortableColumn(props: Omit<KanbanColumnProps, "dragHandleProps">) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.section.id, data: { type: "column" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : undefined,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <KanbanColumn
        {...props}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

export default function KanbanColumn({
  section,
  tasks,
  columnIndex = 0,
  onRename,
  onDelete,
  onTaskDelete,
  onTaskToggle,
  onTaskView,
  onTaskAdd,
  getReminderLabel,
  justCompleted,
  dragHandleProps,
}: KanbanColumnProps) {
  const [editing, setEditing] = useState(false);
  const [titleInput, setTitleInput] = useState(section.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [visibleCount, setVisibleCount] = useState(TASKS_PAGE_SIZE);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVisibleCount(TASKS_PAGE_SIZE);
  }, [section.id]);

  const a = COLUMN_ACCENTS[columnIndex % COLUMN_ACCENTS.length];

  const { setNodeRef, isOver } = useDroppable({
    id: section.id,
    data: { type: "column", sectionId: section.id },
  });

  const visibleTasks = tasks.slice(0, visibleCount);
  const taskIds = visibleTasks.map((t) => t.id);
  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const handleRenameConfirm = () => {
    const trimmed = titleInput.trim();
    if (trimmed && trimmed !== section.title) onRename(section.id, trimmed);
    setEditing(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRenameConfirm();
    if (e.key === "Escape") { setTitleInput(section.title); setEditing(false); }
  };

  const handleDeleteClick = () => {
    if (tasks.length === 0) { onDelete(section.id); return; }
    setConfirmDelete(true);
  };

  return (
    <div
      className="
        kanban-col
        group flex flex-col shrink-0 rounded-2xl transition-all duration-300
      "
      style={{
        width: "300px",
        minWidth: "300px",
        "--col-glow-d": a.glowD,
        "--col-glow-l": a.glowL,
        "--col-border-d": a.borderD,
        "--col-border-l": a.borderL,
        "--col-dot": a.dot,
        "--col-badge-bg-d": a.badgeBgD,
        "--col-badge-bg-l": a.badgeBgL,
        "--col-badge-text-d": a.badgeTextD,
        "--col-badge-text-l": a.badgeTextL,
      } as React.CSSProperties}
      data-over={isOver ? "true" : undefined}
    >
      {/* Top accent line */}
      <div
        className="kanban-col__accent-line h-0.5 rounded-t-2xl transition-all duration-300"
        style={{
          background: `linear-gradient(90deg, transparent, ${a.dot}, transparent)`,
          opacity: isOver ? 1 : 0.45,
        }}
      />

      {/* ── Header ── */}
      {editing ? (
        <div className="kanban-col__header flex items-center gap-2 px-4 py-3.5">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: a.dot, boxShadow: `0 0 6px ${a.dot}` }}
          />
          <div className="flex-1 flex items-center gap-2">
            <input
              ref={inputRef}
              autoFocus
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              className="kanban-col__rename-input flex-1 bg-transparent text-sm font-semibold outline-none pb-0.5"
              style={{ borderBottom: `1px solid ${a.dot}60` }}
            />
            <button onClick={handleRenameConfirm} className="p-1.5 rounded-lg text-emerald-500/80 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all">
              <Check size={12} />
            </button>
            <button onClick={() => { setTitleInput(section.title); setEditing(false); }} className="p-1.5 rounded-lg text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
              <X size={12} />
            </button>
          </div>
        </div>
      ) : (
        <div
          {...dragHandleProps}
          className="kanban-col__header flex items-center gap-2.5 px-4 py-3.5 cursor-grab active:cursor-grabbing select-none rounded-t-2xl"
        >
          <GripVertical size={14} className="kanban-col__grip shrink-0 pointer-events-none transition-colors duration-200" />
          <div className="w-2 h-2 rounded-full shrink-0 pointer-events-none" style={{ background: a.dot, boxShadow: `0 0 8px ${a.dot}80` }} />
          <span className="kanban-col__title flex-1 text-sm font-semibold truncate tracking-tight pointer-events-none">
            {section.title}
          </span>
          <span className="kanban-col__badge text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full shrink-0 pointer-events-none">
            {tasks.length}
          </span>
          <div
            className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); setTimeout(() => inputRef.current?.focus(), 10); }}
              className="kanban-col__action-btn p-1.5 rounded-lg transition-all"
              title="Rename section"
            >
              <Pencil size={11} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteClick(); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
              title="Delete section"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      )}

      {/* ── Progress bar ── */}
      {tasks.length > 0 && (
        <div className="px-4 pt-2.5 pb-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="kanban-col__progress-label text-[10px] font-medium">
              {completedCount}/{tasks.length} done
            </span>
            <span className="text-[10px] font-semibold" style={{ color: a.dot }}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="kanban-col__progress-track h-0.75 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${a.dot}80, ${a.dot})`,
                boxShadow: `0 0 6px ${a.dot}60`,
              }}
            />
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {confirmDelete && (
        <div className="mx-3 mt-3 px-3 py-3 rounded-xl bg-rose-500/8 border border-rose-500/20">
          <p className="text-[11.5px] text-rose-500 mb-2.5 leading-relaxed">
            Delete <span className="font-semibold">"{section.title}"</span> and{" "}
            <span className="font-semibold">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</span>?
          </p>
          <div className="flex gap-2">
            <button onClick={() => { onDelete(section.id); setConfirmDelete(false); }} className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg bg-rose-500/80 hover:bg-rose-500 text-white transition-all">
              Delete all
            </button>
            <button onClick={() => setConfirmDelete(false)} className="kanban-col__cancel-btn flex-1 text-[11px] py-1.5 rounded-lg border transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Tasks drop zone ── */}
      <div
        ref={setNodeRef}
        className="kanban-col__drop-zone flex flex-col gap-2 p-3 flex-1 min-h-40 transition-all duration-200"
        data-over={isOver ? "true" : undefined}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {visibleTasks.map((task, idx) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              index={idx}
              onDelete={onTaskDelete}
              onToggle={onTaskToggle}
              onView={onTaskView}
              reminderLabel={getReminderLabel?.(task.id) ?? null}
              isJustCompleted={justCompleted?.has(task.id) ?? false}
            />
          ))}
        </SortableContext>

        {tasks.length > visibleTasks.length && (
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + TASKS_PAGE_SIZE)}
            className="rounded-lg border px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-black/5"
          >
            Show more ({tasks.length - visibleTasks.length} left)
          </button>
        )}

        {tasks.length === 0 && !isOver && (
          <div className="flex-1 flex flex-col items-center justify-center min-h-28 gap-2">
            <Sparkles size={15} style={{ color: a.dot, opacity: 0.3 }} />
            <p className="kanban-col__empty-text text-[11px] select-none">No tasks yet</p>
          </div>
        )}

        {isOver && tasks.length === 0 && (
          <div
            className="kanban-col__drop-target flex-1 min-h-20 rounded-xl flex items-center justify-center"
          >
            <p className="kanban-col__drop-target-text text-[11px] font-medium">Drop here</p>
          </div>
        )}
      </div>

      {/* ── Add task button ── */}
      <button
        onClick={() => onTaskAdd(section.id)}
        className="kanban-col__add-btn flex items-center justify-center gap-2 py-3 text-[12px] font-medium rounded-b-2xl transition-all duration-200"
      >
        <Plus size={13} strokeWidth={2.5} />
        Add task
      </button>
    </div>
  );
}

// ─── SortableTaskCard ─────────────────────────────────────────────────────────

function SortableTaskCard({
  task,
  index,
  onDelete,
  onToggle,
  onView,
  reminderLabel,
  isJustCompleted,
}: {
  task: Task;
  index: number;
  onDelete: (id: string) => void;
  onToggle: (id: string, e?: React.MouseEvent) => void;
  onView: (task: Task) => void;
  reminderLabel: string | null;
  isJustCompleted: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", sectionId: task.sectionId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing touch-none"
    >
      <TaskCard
        task={task}
        index={index}
        onDelete={onDelete}
        onToggle={onToggle}
        onView={onView}
        reminderLabel={reminderLabel}
        isDragging={isDragging}
        isJustCompleted={isJustCompleted}
      />
    </div>
  );
}
