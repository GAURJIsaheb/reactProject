import { LayoutGrid } from "lucide-react";

export default function EmptyBoardState({ onCreateFirst }: { onCreateFirst: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center
        bg-indigo-500/10 border border-indigo-400/20 text-indigo-400">
        <LayoutGrid size={28} />
      </div>

      <div className="text-center">
        <p className="text-base font-semibold text-foreground mb-1">No sections yet</p>
        <p className="text-sm text-muted-foreground">
          Create a section to start organising your tasks
        </p>
      </div>

      <button
        onClick={onCreateFirst}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white
          bg-linear-to-br from-indigo-500 to-violet-500"
      >
        + Create first section
      </button>
    </div>
  );
}