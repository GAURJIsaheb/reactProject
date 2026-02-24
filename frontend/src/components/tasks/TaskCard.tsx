import { Pencil, Trash2, GripVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Task } from "@/types/task";

// Vibrant card color palettes — cycles by index or task id hash
const CARD_PALETTES = [
  {
    bg: "bg-[#dbeafe]",
    border: "border-[#93c5fd]",
    accent: "bg-[#3b82f6]",
    dot: "bg-[#2563eb]",
    hover: "hover:bg-[#bfdbfe]",
    text: "text-[#1e3a5f]",
    sub: "text-[#3b82f6]",
    check: "from-[#3b82f6] to-[#6366f1]",
  },
  {
    bg: "bg-[#fce7f3]",
    border: "border-[#f9a8d4]",
    accent: "bg-[#ec4899]",
    dot: "bg-[#db2777]",
    hover: "hover:bg-[#fbcfe8]",
    text: "text-[#5b1a38]",
    sub: "text-[#ec4899]",
    check: "from-[#ec4899] to-[#a855f7]",
  },
  {
    bg: "bg-[#dcfce7]",
    border: "border-[#86efac]",
    accent: "bg-[#22c55e]",
    dot: "bg-[#16a34a]",
    hover: "hover:bg-[#bbf7d0]",
    text: "text-[#14532d]",
    sub: "text-[#16a34a]",
    check: "from-[#22c55e] to-[#06b6d4]",
  },
  {
    bg: "bg-[#fef9c3]",
    border: "border-[#fde047]",
    accent: "bg-[#eab308]",
    dot: "bg-[#ca8a04]",
    hover: "hover:bg-[#fef08a]",
    text: "text-[#713f12]",
    sub: "text-[#ca8a04]",
    check: "from-[#f59e0b] to-[#ef4444]",
  },
  {
    bg: "bg-[#ede9fe]",
    border: "border-[#c4b5fd]",
    accent: "bg-[#8b5cf6]",
    dot: "bg-[#7c3aed]",
    hover: "hover:bg-[#ddd6fe]",
    text: "text-[#2e1065]",
    sub: "text-[#7c3aed]",
    check: "from-[#8b5cf6] to-[#ec4899]",
  },
];

function getPalette(task: Task, index: number) {
  // Use index mod for consistent color assignment
  return CARD_PALETTES[index % CARD_PALETTES.length];
}

interface Props {
  task: Task;
  index: number;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onView: (task: Task) => void;
  // Drag-and-drop props
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragOver?: (e: React.DragEvent, id: string) => void;
  onDrop?: (e: React.DragEvent, id: string) => void;
  isDragging?: boolean;
}

export default function TaskCard({
  task,
  index,
  onDelete,
  onToggle,
  onEdit,
  onView,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging = false,
}: Props) {
  const palette = getPalette(task, index);

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, task.id)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver?.(e, task.id);
      }}
      onDrop={(e) => onDrop?.(e, task.id)}
      onClick={() => onView(task)}
      className={`
        group relative flex flex-col gap-3
        p-4 rounded-2xl border-2
        cursor-pointer select-none
        transition-all duration-200
        ${palette.bg} ${palette.border} ${palette.hover}
        ${isDragging ? "opacity-40 scale-95 rotate-1" : "opacity-100"}
        hover:shadow-lg hover:-translate-y-0.5
        ${task.completed ? "opacity-60" : ""}
      `}
      style={{ fontFamily: "Syne, sans-serif" }}
    >
      {/* TOP ROW: drag handle + title + menu */}
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        {draggable && (
          <div
            className="shrink-0 mt-0.5 cursor-grab active:cursor-grabbing text-black/25 hover:text-black/50 transition"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={16} />
          </div>
        )}

        {/* Checkbox */}
        <div
          className="shrink-0 mt-0.5"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(task.id);
          }}
        >
          <div
            className={`
              w-5 h-5 rounded-md border-2 flex items-center justify-center
              transition-all duration-200
              ${task.completed
                ? `bg-linear-to-br ${palette.check} border-transparent shadow-md`
                : `bg-white/60 border-current ${palette.sub}`
              }
            `}
          >
            {task.completed && (
              <span className="text-foreground text-[11px] font-black leading-none">✓</span>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p
            className={`
              font-bold text-[14px] leading-snug truncate
              ${palette.text}
              ${task.completed ? "line-through opacity-60" : ""}
            `}
          >
            {task.text}
          </p>
        </div>

        {/* Dropdown menu — stop propagation so card click (view) doesn't fire */}
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`
                  w-7 h-7 rounded-lg flex items-center justify-center
                  bg-black/5 hover:bg-black/15
                  transition ${palette.text} opacity-60 hover:opacity-100
                  text-[16px] font-black tracking-tight leading-none
                `}
              >
                ···
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-35 rounded-xl border border-border bg-card backdrop-blur-xl shadow-xl"
            >
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer text-[13px] font-semibold rounded-lg"
                onClick={() => onEdit(task)}
              >
                <Pencil size={13} className="text-yellow-500" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer text-[13px] font-semibold rounded-lg text-red-500 focus:text-red-600 focus:bg-red-50"
                onClick={() => onDelete(task.id)}
              >
                <Trash2 size={13} />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Image preview */}
      {task.image && (
        <div className="flex justify-center">
        <img
          src={task.image}
          alt="attachment"
          className="w-[45%] aspect-video object-cover rounded-xl"
        />
</div>
      )}

      {/* BOTTOM ROW: time / sync status */}
      <div className="flex items-center justify-between mt-1">
        <span
          className={`text-[11px] font-semibold font-mono ${palette.sub} opacity-80`}
        >
          {new Date(task.createdAt ?? Date.now()).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>

        <div className="flex items-center gap-1.5">
          <div
            className={`
              w-1.5 h-1.5 rounded-full shrink-0
              ${task.syncStatus === "synced"
                ? "bg-emerald-500"
                : "bg-amber-400 animate-pulse"}
            `}
          />
          <span
            className={`text-[10px] font-bold font-mono uppercase tracking-wide
              ${task.syncStatus === "synced" ? "text-emerald-600" : "text-amber-500"}
            `}
          >
            {task.syncStatus === "synced" ? "Synced" : "Pending"}
          </span>
        </div>
      </div>

      {/* Subtle accent strip at bottom */}
      <div
        className={`
          absolute bottom-0 left-4 right-4 h-0.5 rounded-full
          ${palette.accent} opacity-30
          transition-all group-hover:opacity-60 group-hover:left-2 group-hover:right-2
        `}
      />
    </div>
  );
}