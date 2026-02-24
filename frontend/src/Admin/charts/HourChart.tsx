import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import DarkTooltip from "../components/DarkTooltip";
import type { HourData } from "../types/analytics.types";

type Props = { data: HourData[] };

export default function HourChart({ data }: Props) {
   // console.log("HourChart data:", data); 
  const max = Math.max(...data.map(h => h.count), 1);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex-1">
      <div className="mb-4 text-xs tracking-[3px] uppercase text-orange-400 font-mono">
        Activity by Hour
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
          <XAxis dataKey="_id" tick={{ fill: "#71717a", fontSize: 9 }} interval={3} />
          <YAxis tick={{ fill: "#71717a", fontSize: 10 }} />
          <Tooltip content={<DarkTooltip />} cursor={{ fill: "#ffffff10" }} />
          <Bar
            dataKey="count"
            radius={[4, 4, 0, 0]}
            shape={(props: any) => {
              const { x, y, width, height, index } = props;
              const entry = data[index];
              const lightness = 45 + (entry.count / max) * 35;
              return (
                <rect
                  x={x} y={y} width={width} height={height}
                  fill={`hsl(${180 + index * 5}, 90%, ${lightness}%)`}
                  rx={4} ry={4}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}