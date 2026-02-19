import { Card } from "@/components/ui/card";
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
    <Card className="mb-2 bg-[#0f172a] border border-white/10 rounded-xl">
      <div className="flex items-center gap-3 px-4 py-3 w-full">

        {/* checkbox */}
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task.id)}
          className="w-4 h-4 accent-blue-500 cursor-pointer shrink-0"
        />

        {/* image */}
        {task.image && (
          <img
            src={task.image}
            alt="task"
            className="w-14 h-14 rounded-md object-cover shrink-0"
          />
        )}

        {/* text */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium truncate ${
              task.completed ? "line-through text-gray-500" : "text-white"
            }`}
          >
            {task.text}
          </p>

          <p className="text-[11px] text-gray-400 mt-0.5">
            {task.syncStatus === "synced" ? "🟢 Synced" : "🟡 Pending sync"}
          </p>
        </div>

        {/* buttons */}
        <div className="flex items-center gap-2 shrink-0">

          <button
            className="task-btn"
            onClick={() => onView(task)}
            title="View"
          >
            <Eye size={18} />
          </button>

          <button
            className="task-btn edit"
            onClick={() => onEdit(task)}
            title="Edit"
          >
            <Pencil size={18} />
          </button>

          <button
            className="task-btn delete"
            onClick={() => onDelete(task.id)}
            title="Delete"
          >
            <Trash2 size={18} />
          </button>

          <button
            className="task-btn share"
            onClick={() => onShare(task)}
            title="Share"
          >
            <Send size={18} />
          </button>

        </div>
      </div>
    </Card>
  );
}
