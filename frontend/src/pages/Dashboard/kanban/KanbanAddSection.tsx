import { Plus, LayoutList } from "lucide-react";
import { useState } from "react";

export default function KanbanAddSection({
  onCreate,
}: {
  onCreate: (title: string) => void;
}) {
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
    <div className="shrink-0 w-65">
      {adding ? (
        <div
          className="
            flex flex-col gap-3 p-4 rounded-2xl
            bg-background border border-border
            shadow-[0_0_24px_rgba(139,92,246,0.08)]
            animate-in fade-in slide-in-from-top-2 duration-200
          "
        >
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <LayoutList size={13} className="text-violet-400/70 shrink-0" />
            <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">
              New Section
            </span>
          </div>

          <input
            autoFocus
            placeholder="Section name..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setTitle(""); setAdding(false); }
            }}
            className="
              w-full bg-white/4 text-sm text-foreground
              placeholder-slate-600 outline-none
              border border-white/[0.07] focus:border-violet-500/40
              rounded-xl px-3 py-2 transition-all duration-200
            "
          />

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="
                flex-1 text-[12px] font-semibold py-2 rounded-xl
                bg-violet-600 hover:bg-violet-500 text-white
                transition-all duration-200
                shadow-[0_0_14px_rgba(139,92,246,0.25)]
                hover:shadow-[0_0_20px_rgba(139,92,246,0.35)]
              "
            >
              Create
            </button>
            <button
              onClick={() => { setTitle(""); setAdding(false); }}
              className="
                flex-1 text-[12px] py-2 rounded-xl
                border border-white/8 text-slate-500
                hover:text-slate-300 hover:border-white/15
                transition-all duration-200
              "
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="
            group w-full min-h-36 rounded-2xl
            border-2 border-dashed border-white/6
            hover:border-violet-500/25 hover:bg-violet-500/3
            flex flex-col items-center justify-center gap-2.5
            transition-all duration-300
          "
        >
          <div
            className="
              w-8 h-8 rounded-xl flex items-center justify-center
              bg-white/4 border border-white/6
              group-hover:bg-violet-500/10 group-hover:border-violet-500/25
              transition-all duration-300
            "
          >
            <Plus size={15} className="text-slate-600 group-hover:text-violet-400 transition-colors duration-200" strokeWidth={2.5} />
          </div>
          <span className="text-[12px] font-medium text-slate-600 group-hover:text-slate-400 transition-colors duration-200">
            Add section
          </span>
        </button>
      )}
    </div>
  );
}