import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import DarkTooltip from "../components/DarkTooltip";
import { NEON } from "../utils/helpers";

import type{ GrowthPoint } from "../types/analytics.types";

type Props = {
  data: GrowthPoint[];
};

export default function GrowthChart({ data }:Props) {
  return (
    <div className="bg-white/5 border border-zinc-900 rounded-2xl p-6">
      <div className="mb-4 text-xs tracking-[3px] uppercase text-cyan-400 font-mono">
        Task Growth — Last 30 Days
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="gCyan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={NEON.cyan} stopOpacity={0.35}/>
              <stop offset="95%" stopColor={NEON.cyan} stopOpacity={0}/>
            </linearGradient>
          </defs>

          <CartesianGrid stroke="#1a1a1a" strokeDasharray="3 3" />
          <XAxis dataKey="_id" tick={{ fill: "#666", fontSize: 10 }} />
          <YAxis tick={{ fill: "#666", fontSize: 10 }} />
          <Tooltip content={<DarkTooltip />} />

          <Area
            type="monotone"
            dataKey="count"
            stroke={NEON.cyan}
            strokeWidth={2}
            fill="url(#gCyan)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}