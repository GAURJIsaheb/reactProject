import { Eye, Pencil, Trash2, Send } from "lucide-react";
import type { Task } from "@/types/task";

interface Props {
  task: Task;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onView: (task: Task) => void;
  onShare: (task: Task) => void;
}

export default function TaskCard({
  task,
  onDelete,
  onToggle,
  onEdit,
  onView,
  onShare,
}: Props) {
  return (
    <div
      className={`
      group relative flex items-center gap-3.5 
      px-4 py-3 rounded-2xl
      border backdrop-blur-xl
      transition-all duration-300 ease-in-out
      overflow-hidden
      bg-card border-border
      hover:bg-muted hover:translate-x-1
      hover:border-indigo-500/30
      hover:shadow-[-4px_0_20px_rgba(99,102,241,0.15),0_8px_30px_rgba(0,0,0,0.3)]
      ${task.completed ? "border-emerald-500/15 hover:border-emerald-500/25 hover:shadow-[-4px_0_20px_rgba(16,185,129,0.1),0_8px_30px_rgba(0,0,0,0.25)]" : ""}
    `}
    >
      {/* gradient hover overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[linear-gradient(135deg,rgba(99,102,241,0.05),transparent_50%)]" />

      {/* left accent bar */}
      <div
        className={`
        absolute left-0 top-[10%] bottom-[10%] w-0.85 rounded-r
        opacity-0 transition group-hover:opacity-100
        ${task.completed
            ? "bg-[linear-gradient(180deg,#10b981,#06b6d4)]"
            : "bg-[linear-gradient(180deg,#6366f1,#8b5cf6)]"}
      `}
      />

      {/* checkbox */}
      <div className="shrink-0" onClick={() => onToggle(task.id)}>
        <div
          className={`
          w-5 h-5 rounded-[7px] border-2 flex items-center justify-center
          transition-all duration-200
          bg-white/5 border-foreground
          hover:border-indigo-500/60 hover:bg-indigo-500/10
          ${task.completed
              ? "bg-linear-to-br from-emerald-500 to-cyan-500 border-transparent shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              : ""}
        `}
        >
          {task.completed && (
            <span className="text-white text-[11px] font-bold">✓</span>
          )}
        </div>
      </div>

      {/* image */}
      {task.image && (
        <img
          src={task.image}
          alt="task"
          className="w-11.5 h-11.5 rounded-xl object-cover shrink-0 border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
        />
      )}

      {/* body */}
      <div className="flex-1 min-w-0">
        <div
          className={`
          font-semibold text-sm truncate transition-colors
          text-foreground
          ${task.completed ? "text-muted-foreground" : ""}
        `}
          style={{ fontFamily: "Syne, sans-serif" }}
        >
          {task.text}
        </div>

        <div
          className="flex items-center gap-1.5 mt-1 text-[10px] font-medium"
          style={{ fontFamily: "JetBrains Mono, monospace" }}
        >
          <div
            className={`
            w-1.5 h-1.5 rounded-full shrink-0
            ${task.syncStatus === "synced"
                ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]"
                : "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)] animate-pulse"}
          `}
          />
          <span
            className={`
            ${task.syncStatus === "synced"
                ? "text-emerald-600"
                : "text-amber-600"}
          `}
          >
            {task.syncStatus === "synced" ? "Synced" : "Pending"}
          </span>
        </div>
      </div>

      {/* actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* view */}
        <button
          onClick={() => onView(task)}
          className="w-8.5 h-8.5 flex items-center justify-center rounded-xl bg-white/5 text-gray-500 transition-all hover:scale-110 hover:bg-indigo-500/20 hover:border hover:border-indigo-500/40 hover:text-indigo-300 hover:shadow-[0_0_12px_rgba(99,102,241,0.3)]"
        >
          <Eye size={15} />
        </button>

        {/* edit */}
        <button
          onClick={() => onEdit(task)}
          className="w-8.5 h-8.5 flex items-center justify-center rounded-xl bg-white/5 text-gray-500 transition-all hover:scale-110 hover:bg-yellow-500/15 hover:border hover:border-yellow-500/35 hover:text-yellow-300 hover:shadow-[0_0_12px_rgba(234,179,8,0.25)]"
        >
          <Pencil size={15} />
        </button>

        {/* delete */}
        <button
          onClick={() => onDelete(task.id)}
          className="w-8.5 h-8.5 flex items-center justify-center rounded-xl bg-white/5 text-gray-500 transition-all hover:scale-110 hover:bg-red-500/15 hover:border hover:border-red-500/35 hover:text-red-400 hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]"
        >
          <Trash2 size={15} />
        </button>

        {/* share */}
        <button
          onClick={() => onShare(task)}
          className="w-8.5 h-8.5 flex items-center justify-center rounded-xl bg-white/5 text-gray-500 transition-all hover:scale-110 hover:bg-cyan-500/15 hover:border hover:border-cyan-500/35 hover:text-cyan-300 hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
