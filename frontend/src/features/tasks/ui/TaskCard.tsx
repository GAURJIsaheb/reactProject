import { memo, useMemo, useState } from "react";
import { Trash2, Check, ListTodo, Sparkles } from "lucide-react";
import { apiFetchTaskImageUrl } from "@/services/task.service";
import { getSubtaskProgressLabel, hasIncompleteSubtasks } from "@/shared/lib/subtasks";
import type { Task } from "@/shared/types/task";
import { useAuthStore } from "@/zustand/authStore";

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

interface Props {
  task: Task;
  index: number;
  onDelete: (id: string) => void;
  onToggle: (id: string, e?: React.MouseEvent) => void;
  onView: (task: Task) => void;
  isDragging?: boolean;
  isJustCompleted?: boolean;
  reminderLabel?: string | null;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
}

function TaskCard({
  task,
  index,
  onDelete,
  onToggle,
  onView,
  isDragging = false,
  isJustCompleted = false,
  reminderLabel,
}: Props) {
  const { token } = useAuthStore();
  const palette = getPalette(index);
  const isCompleted = task.completed;
  const hasImage = Boolean(task.imageUrl || task.image);
  const subtaskProgress = getSubtaskProgressLabel(task.subtasks);
  const hasOpenSubtasks = hasIncompleteSubtasks(task.subtasks);
  const [showImage, setShowImage] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(
    task.imageUrl && /^https?:\/\//.test(task.imageUrl)
      ? task.imageUrl
      : task.image && /^https?:\/\//.test(task.image)
        ? task.image
        : null
  );
  const { title, description } = useMemo(() => {
    const raw = (task.text ?? "").trim();
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length > 1) {
      return { title: lines[0], description: lines.slice(1).join(" ") };
    }

    return { title: raw, description: "" };
  }, [task.text]);

  return (
    <div
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button,[role=menuitem]")) return;
        onView(task);
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
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggle(task.id, event);
          }}
          className={[
            "shrink-0 mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center",
            "font-bold transition-all duration-300 shadow-sm",
            isCompleted
              ? `bg-linear-to-br ${palette.check} border-2 border-transparent text-white shadow-md scale-110 ring-2 ${palette.ring}`
              : "bg-white/70 border-2 border-black/20 hover:border-black/40 hover:bg-white/90",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {isCompleted ? (
            <Check size={14} strokeWidth={3} />
          ) : (
            <span className="text-[10px] opacity-0 group-hover:opacity-30">v</span>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={[
              "font-bold text-[14.5px] leading-tight truncate transition-all duration-300",
              isCompleted ? "line-through decoration-2 text-gray-500/80" : palette.text,
            ].join(" ")}
            style={
              isCompleted
                ? { textDecorationColor: "rgba(99,102,241,0.55)" }
                : undefined
            }
          >
            {title}
          </p>
          {description && (
            <p
              className={[
                "mt-1 text-[12px] leading-snug opacity-80",
                isCompleted ? "text-gray-500/70" : `${palette.text}`,
              ].join(" ")}
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {description}
            </p>
          )}
        </div>

        <div
          onClick={(event) => event.stopPropagation()}
          className={`shrink-0 transition-opacity ${
            isCompleted ? "opacity-40" : "opacity-60 hover:opacity-100"
          }`}
        >
          <button
            type="button"
            className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-semibold text-red-500 hover:text-red-600 hover:bg-red-50/80 transition"
            onClick={() => onDelete(task.id)}
          >
            <Trash2 size={13} className="mr-2" />
            Delete
          </button>
        </div>
      </div>

      {hasImage && (
        <>
          <div className="flex">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                const next = !showImage;
                setShowImage(next);

                if (next && !resolvedImageUrl && task.image && token && !loadingImage) {
                  setLoadingImage(true);
                  apiFetchTaskImageUrl(task.id, token)
                    .then((data) => {
                      if (data.imageUrl) setResolvedImageUrl(data.imageUrl);
                    })
                    .catch(() => {
                      // Non-blocking UI action.
                    })
                    .finally(() => setLoadingImage(false));
                }
              }}
              className={`text-[11px] font-semibold underline underline-offset-2 ${
                isCompleted ? "text-gray-500" : palette.sub
              }`}
            >
              {showImage ? "Hide image" : "View image"}
            </button>
          </div>
          {showImage && (
            <div className={`flex justify-center ${isCompleted ? "opacity-60" : ""}`}>
              {resolvedImageUrl ? (
                <img
                  src={resolvedImageUrl}
                  alt="attachment"
                  loading="lazy"
                  decoding="async"
                  className="w-[75%] aspect-video object-cover rounded-sm shadow-sm"
                />
              ) : (
                <div className="text-[11px] text-muted-foreground py-2">
                  {loadingImage ? "Loading image..." : "Image unavailable"}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {reminderLabel && (
        <div
          className={`mt-0.5 inline-flex items-center self-start px-2 py-1 rounded-full text-[10px] font-semibold border ${
            isCompleted
              ? "border-gray-400/40 text-gray-500 bg-gray-200/40"
              : "border-indigo-400/50 text-indigo-700 bg-indigo-300/25"
          }`}
        >
          Reminder: {reminderLabel}
        </div>
      )}

      {!!task.labels?.length && (
        <div className="flex flex-wrap gap-1.5">
          {task.labels.map((label) => (
            <span
              key={label}
              className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold border ${
                isCompleted
                  ? "border-gray-300/70 text-gray-500 bg-white/50"
                  : `${palette.border} ${palette.text} bg-white/45`
              }`}
            >
              #{label}
            </span>
          ))}
        </div>
      )}

      {subtaskProgress && (
        <div
          className={`inline-flex items-center self-start gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold border ${
            hasOpenSubtasks
              ? "border-amber-300/70 bg-amber-100/70 text-amber-800"
              : "border-emerald-300/70 bg-emerald-100/70 text-emerald-800"
          }`}
        >
          {hasOpenSubtasks ? <ListTodo size={11} /> : <Sparkles size={11} />}
          {subtaskProgress}
        </div>
      )}

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
              task.syncStatus === "synced" ? "bg-emerald-500" : "bg-amber-400 animate-pulse"
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

export default memo(TaskCard);
