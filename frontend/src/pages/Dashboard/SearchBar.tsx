import { Search } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function SearchBar({ value, onChange }: Props) {
  return (
    <div className="w-full relative">
      <Search
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search tasks..."
        className={`
          w-full    
          pl-10 pr-4 py-3
          rounded-2xl
          bg-white/5 border border-border
          text-sm text-foreground
          placeholder:text-gray-400
          focus:outline-none focus:ring-2 focus:ring-indigo-500/40
          backdrop-blur
        `}
      />
    </div>
  );
}