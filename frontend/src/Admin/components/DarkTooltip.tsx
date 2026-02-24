import type{TooltipPayloadItem } from "../types/analytics.types";

type Props = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  fill?: string;   
};

export default function DarkTooltip({ active, payload, label }: Props) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-black border border-zinc-700 rounded-lg p-3 text-xs font-mono">
      <div className="text-zinc-400 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.fill || p.color || "#22d3ee" }}>
          {p.name}: <strong className="text-white">{p.value}</strong>
        </div>
      ))}
    </div>
  );
}