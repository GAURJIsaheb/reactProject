import { Plus } from "lucide-react";
import { useState } from "react";

export default function KanbanAddSection({ onCreate }: { onCreate: (title: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  const handleAdd = () => {
    const t = title.trim();
    if (!t) return;
    onCreate(t);
    setTitle("");
    setAdding(false);
  };

  return (
    <div className="shrink-0 w-72">
      {adding ? (
        <div className="flex flex-col gap-2 p-4 rounded-2xl border border-dashed border-indigo-400/40 bg-card/40">
          <input
            autoFocus
            placeholder="Section title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setAdding(false);
            }}
            className="bg-transparent text-sm outline-none border-b border-indigo-400 pb-1"
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="text-xs px-3 py-1 rounded-lg bg-indigo-500 text-white">
              Add
            </button>
            <button onClick={() => setAdding(false)} className="text-xs px-3 py-1 rounded-lg border">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full h-14 rounded-2xl border border-dashed flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={14} />
          Add section
        </button>
      )}
    </div>
  );
}