import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { NEON } from "../utils/helpers";

import type{TaskPerUser } from "../types/analytics.types";

type Props = {
  data: TaskPerUser[];
};

export default function TasksPerUserChart({ data }:Props) {
   // console.log("TasksPerUser data:", data); 
  return (
    <div className="bg-white/5 border border-zinc-900 rounded-2xl p-6 flex-1">
      <div className="mb-4 text-xs tracking-[3px] uppercase text-purple-400 font-mono">
        Tasks per User (Top 10)
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid stroke="#1a1a1a" strokeDasharray="3 3" />
          <XAxis type="number"  tick={{ fill: "#666", fontSize: 10 }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "#aaa", fontSize: 10 }}
            width={80}
          />
          <Tooltip
          contentStyle={{ background: "#0a0a0a", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: "12px" }}
          labelStyle={{ color: "#a1a1aa" }}
          itemStyle={{ color: "#fff" }}
/>

          <Bar dataKey="count" fill={NEON.purple} radius={[0,4,4,0]} />
          <Bar dataKey="completed" fill={NEON.green} radius={[0,4,4,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}