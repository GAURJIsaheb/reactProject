import { ago, NEON } from "../utils/helpers";
import type { ActivityItem } from "../types/analytics.types";

type Props = {
  recentActivity: ActivityItem[];
};

export default function ActivityFeed({ recentActivity }: Props) {
  return (
    <div className="bg-white/5 border border-zinc-900 rounded-2xl p-6">
      <div className="mb-4 text-xs tracking-[3px] uppercase text-cyan-400 font-mono">
        Live Activity Feed
      </div>

      <div className="flex flex-col gap-3 max-h-70 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {recentActivity.map((t, i) => {
          const txt = t.text ?? "";

          const color = t.completed
            ? NEON.green
            : t.archived
            ? NEON.purple
            : NEON.cyan;

          return (
            <div key={i} className="flex items-center gap-3 border-b border-zinc-900 pb-2">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: color,
                  boxShadow: `0 0 6px ${color}`,
                }}
              />

              <div className="flex-1 min-w-0">
                <span className="text-sm text-zinc-300">
                  {txt.slice(0, 40)}
                  {txt.length > 40 && "…"}
                </span>

                <span className="ml-2 text-xs text-zinc-500 font-mono">
                  by {t.name || t.email || "?"}
                </span>
              </div>

              <div className="text-xs text-zinc-600 font-mono shrink-0">
                {ago(t.updatedAt)}
              </div>
            </div>
          );
        })}

        {recentActivity.length === 0 && (
          <div className="text-zinc-600 text-sm">No activity yet</div>
        )}
      </div>
    </div>
  );
}