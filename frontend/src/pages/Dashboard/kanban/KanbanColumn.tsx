import { useState, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import {SortableContext,verticalListSortingStrategy,useSortable,} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, Check, X, Plus } from "lucide-react";
import type { Section } from "@/types/section";
import type { Task } from "@/types/task";
import TaskCard from "@/components/tasks/TaskCard";
// ─── Types ────────────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  section: Section;
  tasks: Task[];
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onTaskDelete: (id: string) => void;
  onTaskToggle: (id: string, e?: React.MouseEvent) => void;
  onTaskEdit: (task: Task) => void;
  onTaskView: (task: Task) => void;
  onTaskAdd: (sectionId: string) => void;
  justCompleted?: Set<string>;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
}

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
    opacity: isDragging ? 0 : 1, // ghost shown via DragOverlay
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
  onRename,
  onDelete,
  onTaskDelete,
  onTaskToggle,
  onTaskEdit,
  onTaskView,
  onTaskAdd,
  justCompleted,
  dragHandleProps,
}: KanbanColumnProps) {
  const [editing, setEditing] = useState(false);
  const [titleInput, setTitleInput] = useState(section.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: section.id,
    data: { type: "column", sectionId: section.id },
  });

  const taskIds = tasks.map((t) => t.id);

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
      className={`
        group flex flex-col w-80 shrink-0 rounded-2xl border
        bg-linear-to-b from-card/80 to-card/40 backdrop-blur-sm
        border-border/40 shadow-sm
        transition-all duration-200
        ${isOver
          ? "border-indigo-500/60 bg-indigo-950/20 scale-[1.015] shadow-[0_0_20px_rgba(99,102,241,0.15)]"
          : ""}
      `}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border/30">

        {/* Column drag handle — ONLY this grip drags the whole column */}
        <span
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors shrink-0"
          title="Drag to reorder section"
        >
          <GripVertical size={16} />
        </span>

        {editing ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              ref={inputRef}
              autoFocus
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              className="flex-1 bg-transparent text-base font-semibold outline-none border-b-2 border-indigo-400 focus:border-indigo-500 pb-0.5"
            />
            <button onClick={handleRenameConfirm} className="text-emerald-500 hover:text-emerald-400 transition-colors">
              <Check size={16} />
            </button>
            <button onClick={() => { setTitleInput(section.title); setEditing(false); }} className="text-rose-500 hover:text-rose-400 transition-colors">
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-base font-semibold truncate select-none">
              {section.title}
            </span>
            <span className="text-xs font-mono bg-muted/50 px-2 py-0.5 rounded-full shrink-0">
              {tasks.length}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 10); }}
                className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                title="Rename section"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={handleDeleteClick}
                className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                title="Delete section"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Delete confirmation ── */}
      {confirmDelete && (
        <div className="mx-3 mt-3 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs text-rose-300 font-medium mb-2">
            Delete{" "}
            <span className="font-bold">"{section.title}"</span> and all{" "}
            <span className="font-bold">
              {tasks.length} task{tasks.length !== 1 ? "s" : ""}
            </span>
            ?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { onDelete(section.id); setConfirmDelete(false); }}
              className="flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors"
            >
              Yes, delete all
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 text-[11px] px-2 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Tasks area ── */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-3 p-3 flex-1 min-h-45 transition-all duration-200"
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task, idx) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              index={idx}
              onDelete={onTaskDelete}
              onToggle={onTaskToggle}
              onEdit={onTaskEdit}
              onView={onTaskView}
              isJustCompleted={justCompleted?.has(task.id) ?? false}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isOver && (
          <div className="flex-1 flex items-center justify-center min-h-25">
            <p className="text-sm text-muted-foreground/40 italic select-none">
              Drop tasks here
            </p>
          </div>
        )}

        {isOver && tasks.length === 0 && (
          <div className="flex-1 min-h-20 rounded-xl border-2 border-dashed border-indigo-400/50 bg-indigo-500/5 flex items-center justify-center">
            <p className="text-xs text-indigo-400/70">Release to drop</p>
          </div>
        )}
      </div>

      {/* ── Add task ── */}
      <button
        onClick={() => onTaskAdd(section.id)}
        className="
          flex items-center justify-center gap-2 py-3 text-sm
          text-muted-foreground hover:text-indigo-300
          hover:bg-indigo-500/10 border-t border-border/30
          rounded-b-2xl transition-colors
        "
      >
        <Plus size={14} />
        Add task
      </button>
    </div>
  );
}

// ─── SortableTaskCard — WHOLE card is draggable

function SortableTaskCard({
  task,
  index,
  onDelete,
  onToggle,
  onEdit,
  onView,
  isJustCompleted,
}: {
  task: Task;
  index: number;
  onDelete: (id: string) => void;
  onToggle: (id: string, e?: React.MouseEvent) => void;
  onEdit: (task: Task) => void;
  onView: (task: Task) => void;
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
    opacity: isDragging ? 0 : 1, // original hides, DragOverlay ghost shown
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
        onEdit={onEdit}
        onView={onView}
        isDragging={isDragging}
        isJustCompleted={isJustCompleted}
      />
    </div>
  );
}