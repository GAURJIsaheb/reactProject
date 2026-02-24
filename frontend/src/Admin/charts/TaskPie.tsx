import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import DarkTooltip from "../components/DarkTooltip";

import type{TaskStatusSlice } from "../types/analytics.types";

type Props = {
  pieData: TaskStatusSlice[];
};
const COLORS = ["#a855f7", "#22d3ee", "#4ade80", "#f97316", "#f43f5e"];
export default function TaskPie({ pieData}:Props) {
    // console.log("pieData:", pieData); 
  return (
    <div className="bg-white/5 border border-zinc-900 rounded-2xl p-6 w-[320px]">
      <div className="mb-4 text-xs tracking-[3px] uppercase text-purple-400 font-mono">
        Task Distribution
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={pieData} innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
            {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
            ))}
            </Pie>
          <Tooltip content={<DarkTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}