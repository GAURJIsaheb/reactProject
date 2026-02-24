import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import DarkTooltip from "../components/DarkTooltip";
import type{ DayData } from "../types/analytics.types";

type Props = {
  data: DayData[];
};


export default function DayChart({ data }:Props) {
  //console.log("DayChart data:", data); 
  return (
    <div className="bg-white/5 border border-zinc-900 rounded-2xl p-6 w-[320px]">
      <div className="mb-4 text-xs tracking-[3px] uppercase text-green-400 font-mono">
        Activity by Day
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid stroke="#1a1a1a" strokeDasharray="3 3" />
          <XAxis dataKey="_id" tick={{ fill: "#666", fontSize: 10 }} />
          <YAxis tick={{ fill: "#666", fontSize: 10 }} />
          <Tooltip content={<DarkTooltip />} />

          <Bar dataKey="count" fill="#22c55e" radius={[4,4,0,0]} />

        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}