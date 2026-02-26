import { Pencil, Trash2, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Task } from "@/types/task";

// ─── Palettes ─────────────────────────────────────────────────────────────────

const CARD_PALETTES = [
  {
    bg: "bg-[#dbeafe]",
    border: "border-[#93c5fd]",
    accent: "bg-[#3b82f6]",
    hover: "hover:bg-[#bfdbfe]",
    text: "text-[#1e3a5f]",
    sub: "text-[#3b82f6]",
    check: "from-[#3b82f6] to-[#6366f1]",
    ring: "ring-[#3b82f6]/30",
  },
  {
    bg: "bg-[#fce7f3]",
    border: "border-[#f9a8d4]",
    accent: "bg-[#ec4899]",
    hover: "hover:bg-[#fbcfe8]",
    text: "text-[#5b1c38]",
    sub: "text-[#ec4899]",
    check: "from-[#ec4899] to-[#a855f7]",
    ring: "ring-[#ec4899]/30",
  },
  {
    bg: "bg-[#d1fae5]",
    border: "border-[#6ee7b7]",
    accent: "bg-[#10b981]",
    hover: "hover:bg-[#a7f3d0]",
    text: "text-[#064e3b]",
    sub: "text-[#10b981]",
    check: "from-[#10b981] to-[#3b82f6]",
    ring: "ring-[#10b981]/30",
  },
  {
    bg: "bg-[#fef3c7]",
    border: "border-[#fcd34d]",
    accent: "bg-[#f59e0b]",
    hover: "hover:bg-[#fde68a]",
    text: "text-[#451a03]",
    sub: "text-[#f59e0b]",
    check: "from-[#f59e0b] to-[#ef4444]",
    ring: "ring-[#f59e0b]/30",
  },
  {
    bg: "bg-[#ede9fe]",
    border: "border-[#c4b5fd]",
    accent: "bg-[#8b5cf6]",
    hover: "hover:bg-[#ddd6fe]",
    text: "text-[#2e1065]",
    sub: "text-[#8b5cf6]",
    check: "from-[#8b5cf6] to-[#ec4899]",
    ring: "ring-[#8b5cf6]/30",
  },
];

function getPalette(index: number) {
  return CARD_PALETTES[index % CARD_PALETTES.length];
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  task: Task;
  index: number;
  onDelete: (id: string) => void;
  onToggle: (id: string, e?: React.MouseEvent) => void;
  onEdit: (task: Task) => void;
  onView: (task: Task) => void;
  isDragging?: boolean;
  isJustCompleted?: boolean;
  // dragHandleProps kept for API compat but unused — whole card is draggable via wrapper
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TaskCard({
  task,
  index,
  onDelete,
  onToggle,
  onEdit,
  onView,
  isDragging = false,
  isJustCompleted = false,
}: Props) {
  const palette = getPalette(index);
  const isCompleted = task.completed;

  return (
    <div
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button,[role=menuitem]")) return;
        if (!isCompleted) onView(task);
      }}
      className={[
        "relative flex flex-col gap-3 p-4 rounded-2xl border-2",
        "select-none transition-all duration-300 ease-out",
        "font-['Syne',sans-serif]",
        isCompleted
          ? "bg-lienar-to-br from-gray-100/80 to-gray-50/60 border-gray-300/60 shadow-inner"
          : `${palette.bg} ${palette.border} ${palette.hover} shadow-sm`,
        isDragging
          ? "opacity-60 scale-[0.97] rotate-1 shadow-2xl"
          : "hover:shadow-md hover:-translate-y-0.5",
        isJustCompleted ? "task-just-completed" : "",
        isCompleted && !isJustCompleted ? "opacity-70 hover:opacity-90" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* ── Top row ── */}
      <div className="flex items-start gap-2.5">

        {/* Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(task.id, e);
          }}
          className={[
            "shrink-0 mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center",
            "font-bold transition-all duration-300 shadow-sm",
            isCompleted
              ? `bg-linear-to-br ${palette.check} border-2 border-transparent text-white shadow-md scale-110 ring-2 ${palette.ring}`
              : `bg-white/70 border-2 border-black/20 hover:border-black/40 hover:bg-white/90`,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {isCompleted ? (
            <Check size={14} strokeWidth={3} />
          ) : (
            <span className="text-[10px] opacity-0 group-hover:opacity-30">✓</span>
          )}
        </button>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p
            className={[
              "font-bold text-[14.5px] leading-tight truncate transition-all duration-300",
              isCompleted
                ? "line-through decoration-2 text-gray-500/80"
                : palette.text,
            ].join(" ")}
            style={
              isCompleted
                ? { textDecorationColor: "rgba(99,102,241,0.55)" }
                : undefined
            }
          >
            {task.text}
          </p>
        </div>

        {/* Menu */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`shrink-0 transition-opacity ${
            isCompleted ? "opacity-40" : "opacity-60 hover:opacity-100"
          }`}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={[
                  "w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition",
                  isCompleted
                    ? "bg-gray-200/40 hover:bg-gray-300/50 text-gray-500"
                    : "bg-black/5 hover:bg-black/15 text-black/60 hover:text-black",
                ].join(" ")}
              >
                ···
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40 rounded-xl bg-background">
              {!isCompleted && (
                <>
                  <DropdownMenuItem
                    onClick={() => onEdit(task)}
                    className="cursor-pointer "
                  >
                    <Pencil size={13} className="mr-2 text-yellow-600" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                className="text-red-500 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                onClick={() => onDelete(task.id)}
              >
                <Trash2 size={13} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Image ── */}
      {task.image && (
        <div className={`flex justify-center ${isCompleted ? "opacity-60" : ""}`}>
          <img
            src={task.image}
            alt="attachment"
            className="w-[45%] aspect-video object-cover rounded-xl shadow-sm"
          />
        </div>
      )}

      {/* ── Bottom row ── */}
      <div
        className={`flex items-center justify-between mt-1 text-[11px] ${
          isCompleted ? "opacity-50" : ""
        }`}
      >
        <span className={`font-mono font-semibold ${isCompleted ? "text-gray-500" : palette.sub}`}>
          {new Date(task.createdAt ?? Date.now()).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              task.syncStatus === "synced"
                ? "bg-emerald-500"
                : "bg-amber-400 animate-pulse"
            }`}
          />
          <span
            className={`font-mono uppercase tracking-wide font-bold text-[10px] ${
              task.syncStatus === "synced" ? "text-emerald-600" : "text-amber-500"
            }`}
          >
            {task.syncStatus === "synced" ? "Synced" : "Pending"}
          </span>
        </div>
      </div>

      {/* ── Accent bar — hidden when done ── */}
      {!isCompleted && (
        <div
          className={`
            absolute bottom-0 left-4 right-4 h-0.5 rounded-full
            ${palette.accent} opacity-40
            transition-all duration-300
            group-hover:opacity-80 group-hover:left-2 group-hover:right-2
          `}
        />
      )}
    </div>
  );
}