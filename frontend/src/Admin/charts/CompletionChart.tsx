import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import DarkTooltip from "../components/DarkTooltip";
import { NEON } from "../utils/helpers";

import type{ CompletionPoint } from "../types/analytics.types";


type Props = {
  data: CompletionPoint[];
};

export default function CompletionChart({ data }:Props) {
  return (
    <div className="bg-white/5 border border-zinc-900 rounded-2xl p-6 w-95">
      <div className="mb-4 text-xs tracking-[3px] uppercase text-green-400 font-mono">
        Completion Rate — Last 7 Days
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid stroke="#1a1a1a" strokeDasharray="3 3" />
          <XAxis dataKey="_id" tick={{ fill: "#666", fontSize: 10 }} />
          <YAxis
            domain={[0,100]}
            unit="%"
            tick={{ fill: "#666", fontSize: 10 }}
          />
          <Tooltip content={<DarkTooltip />} />

          <Line
            type="monotone"
            dataKey="rate"
            stroke={NEON.green}
            strokeWidth={2}
            dot={{ fill: NEON.green, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}