import { useCallback, useEffect, useMemo, useState } from "react";

import Header from "./components/Header";
import StatCard from "./components/StatCard";
import Loader from "./components/Loader";

import { Users, CheckCircle2, Archive, Zap, Activity, Eye } from "lucide-react";
import { API, NEON } from "./utils/helpers";

import type {
  TaskPerUser,
  TopUser,
  ActivityItem,
  GrowthPoint,
  CompletionPoint,
  DayData,
  HourData,
} from "./types/analytics.types";
import GrowthChart from "./charts/GrowthChart";
import TaskPie from "./charts/TaskPie";
import HourChart from "./charts/HourChart";
import DayChart from "./charts/DayChart";
import TasksPerUserChart from "./charts/TasksPerUserChart";
import TopUsers from "./components/TopUsers";
import ActivityFeed from "./components/ActivityFeed";

type AnalyticsMode = "month" | "year";

type AnalyticsResponse = {
  scope: {
    mode: AnalyticsMode;
    year: number;
    month: number | null;
    startAt: number;
    endAt: number;
    label: string;
  };
  totalUsers: number;
  taskStatusCounts: {
    total: number;
    active: number;
    completed: number;
    archived: number;
    deleted: number;
    withImage: number;
  };
  archiveStats: {
    total: number;
    restored: number;
  };
  growthOverTime: GrowthPoint[];
  completionRate: CompletionPoint[];
  activityByDay: DayData[];
  activityByHour: HourData[];
  taskPerUser: TaskPerUser[];
  topUsers: TopUser[];
  recentActivity: ActivityItem[];
};

async function fetchAnalytics(mode: AnalyticsMode, year: number, month: number): Promise<AnalyticsResponse> {
  const token = localStorage.getItem("token");
  const params = new URLSearchParams({ mode, year: String(year) });
  if (mode === "month") params.set("month", String(month));

  const res = await fetch(`${API}/admin/analytics?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function AdminDashboard() {
  const now = useMemo(() => new Date(), []);
  const [mode, setMode] = useState<AnalyticsMode>("month");
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  const yearOptions = useMemo(() => {
    const currentYear = now.getUTCFullYear();
    return Array.from({ length: 6 }, (_, index) => currentYear - index);
  }, [now]);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: index + 1,
        label: new Date(Date.UTC(2026, index, 1)).toLocaleString("en-US", { month: "long" }),
      })),
    []
  );

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchAnalytics(mode, year, month);
      setData(response);
      setLastRefresh(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  }, [mode, year, month]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  if (isLoading) return <Loader />;
  if (error) return <div className="text-red-500 p-10">{error}</div>;
  if (!data) return null;

  const { taskStatusCounts: tsc, totalUsers, archiveStats } = data;
  const compRate =
    tsc.total > 0 ? ((tsc.completed / tsc.total) * 100).toFixed(1) : "0";

  const pieData = [
    { name: "Active", value: tsc.active, color: NEON.cyan },
    { name: "Completed", value: tsc.completed, color: NEON.green },
    { name: "Archived", value: tsc.archived, color: NEON.purple },
    { name: "Deleted", value: tsc.deleted, color: NEON.pink },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white relative font-mono">
      <div
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,245,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,245,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      <Header lastRefresh={lastRefresh} onRefresh={() => { void loadAnalytics(); }} />

      <main className="relative z-10 max-w-[90%] mx-auto p-6 flex flex-col gap-6">
        <section className="flex flex-col gap-3 rounded-2xl border border-cyan-500/20 bg-zinc-950/70 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/70">Analytics Scope</p>
            <p className="mt-1 text-sm text-zinc-400">
              Admin analytics now run only for the selected month or year.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1 text-xs text-zinc-400">
              Mode
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as AnalyticsMode)}
                className="rounded-lg border border-cyan-500/20 bg-black px-3 py-2 text-sm text-white outline-none"
              >
                <option value="month">Month wise</option>
                <option value="year">Year wise</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-zinc-400">
              Year
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded-lg border border-cyan-500/20 bg-black px-3 py-2 text-sm text-white outline-none"
              >
                {yearOptions.map((optionYear) => (
                  <option key={optionYear} value={optionYear}>
                    {optionYear}
                  </option>
                ))}
              </select>
            </label>

            {mode === "month" && (
              <label className="flex flex-col gap-1 text-xs text-zinc-400">
                Month
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="rounded-lg border border-cyan-500/20 bg-black px-3 py-2 text-sm text-white outline-none"
                >
                  {monthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              onClick={() => { void loadAnalytics(); }}
              className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-500/20"
            >
              Refresh
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <StatCard label="Total Users" value={totalUsers} icon={Users} color={NEON.cyan} sub={`joined in ${data.scope.label}`} />
          <StatCard label="Total Tasks" value={tsc.total} icon={Activity} color={NEON.purple} sub={`created in ${data.scope.label}`} />
          <StatCard label="Active Tasks" value={tsc.active} icon={Zap} color={NEON.orange} />
          <StatCard label="Completed" value={tsc.completed} icon={CheckCircle2} color={NEON.green} sub={`${compRate}% completion`} />
          <StatCard label="Archived" value={archiveStats.total} icon={Archive} color={NEON.blue} sub={`within ${data.scope.label}`} />
          <StatCard label="With Images" value={tsc.withImage} icon={Eye} color={NEON.pink} />
        </div>

        <GrowthChart data={data.growthOverTime} />
        <TaskPie pieData={pieData} />
        <HourChart data={data.activityByHour} />
        <DayChart data={data.activityByDay} />
        <TasksPerUserChart data={data.taskPerUser} />
        <TopUsers topUsers={data.topUsers} />
        <ActivityFeed recentActivity={data.recentActivity} />
      </main>
    </div>
  );
}
