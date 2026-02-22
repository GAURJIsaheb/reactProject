import { ArrowUpDown } from "lucide-react";

export type SortType = "new" | "old" | "az";

interface Props {
  sort: SortType;
  setSort: (v: SortType) => void;
}

export default function SortToggle({ sort, setSort }: Props) {
  return (
    <div className="flex items-center justify-center gap-2 bg-card border border-border px-3 py-3 rounded-xl w-full md:w-auto whitespace-nowrap">     
     <ArrowUpDown size={16} className="text-foreground" />

      <select
        value={sort}
        onChange={(e) => setSort(e.target.value as SortType)}
        className="
          bg-card text-sm text-foreground
          focus:outline-none cursor-pointer
        "
      >
        <option value="new">Newest</option>
        <option value="old">Oldest</option>
        <option value="az">A → Z</option>
      </select>
    </div>
  );
}