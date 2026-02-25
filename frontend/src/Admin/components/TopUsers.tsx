import { ago, NEON } from "../utils/helpers";
import type{ TopUser } from "../types/analytics.types";

type Props = {
  topUsers: TopUser[];
};

export default function TopUsers({ topUsers }:Props) {
  return (
    <div className="bg-white/5 border border-zinc-900 rounded-2xl p-6">
      <div className="mb-4 text-xs tracking-[3px] uppercase text-orange-400 font-mono">
        Most Active Users
      </div>

      <div className="flex flex-col gap-3">
        {topUsers.map((u, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-zinc-900 pb-2">
            <div className="w-6 font-bold text-sm text-zinc-500">
              #{i + 1}
            </div>

            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
              style={{
                background: "rgba(191,90,242,0.15)",
                border: "1px solid rgba(191,90,242,0.3)",
                color: NEON.purple,
              }}
            >
              {(u.name || u.email || "?")[0].toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">
                {u.name || "Unknown"}
              </div>
              <div className="text-xs text-zinc-500 font-mono">
                {u.taskCount} tasks · {u.avgVersion?.toFixed(2)}x edits
              </div>
            </div>

            <div className="text-xs text-zinc-600 font-mono">
              {ago(u.lastActive)}
            </div>
          </div>
        ))}

        {topUsers.length === 0 && (
          <div className="text-zinc-600 text-sm">No data yet</div>
        )}
      </div>
    </div>
  );
}