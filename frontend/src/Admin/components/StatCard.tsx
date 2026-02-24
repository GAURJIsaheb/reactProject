import { fmt } from "../utils/helpers";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: number;
  icon: LucideIcon;   // lucide icon component type
  color: string;
  sub?: string;      
};

export default function StatCard({ label, value, icon: Icon, color, sub }:Props) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-5 flex flex-col gap-2"
      style={{ borderColor: `${color}33`, background: "rgba(255,255,255,0.03)" }}
    >
      {/* glow circle */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full"
        style={{
          background: `radial-gradient(circle, ${color}22, transparent 70%)`,
        }}
      />

      <div className="flex items-center gap-2">
        <div
          className="p-2 rounded-lg border"
          style={{ background: `${color}18`, borderColor: `${color}44` }}
        >
          <Icon size={18} color={color} />
        </div>

        <span className="text-xs tracking-widest text-zinc-500 font-mono">
          {label.toUpperCase()}
        </span>
      </div>

      <div className="text-4xl font-extrabold text-white leading-none">
        {fmt(value)}
      </div>

      {sub && <div className="text-xs text-zinc-500 font-mono">{sub}</div>}
    </div>
  );
}