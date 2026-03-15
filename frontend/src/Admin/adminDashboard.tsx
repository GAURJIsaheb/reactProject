import {useMemo, useState } from "react";

import Header from "./components/Header";
import StatCard from "./components/StatCard";
import Loader from "./components/Loader";

import { Users, CheckCircle2, Archive, Zap, Activity, Eye } from "lucide-react";
import { API, NEON } from "./utils/helpers";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import GrowthChart from "./charts/GrowthChart";
import TaskPie from "./charts/TaskPie";
import HourChart from "./charts/HourChart";
import DayChart from "../features/admin/ui/charts/DayChart";
import TasksPerUserChart from "./charts/TasksPerUserChart";
import TopUsers from "./components/TopUsers";
import ActivityFeed from "./components/ActivityFeed";

import type{ AnalyticsMode,AnalyticsResponse } from "./types/analytics.types";

async function fetchAnalytics(
  mode: AnalyticsMode,
  year: number,
  month: number,
  forceRefresh = false
): Promise<AnalyticsResponse> {
  const token = localStorage.getItem("token");
  const params = new URLSearchParams({ mode, year: String(year) });
  if (mode === "month") params.set("month", String(month));
  if (forceRefresh) params.set("refresh", "true");

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

  const queryClient = useQueryClient();

  const queryKey = ["analytics", mode, year, mode === "month" ? month : null] as const;

  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey,
    queryFn: () => fetchAnalytics(mode, year, month),
    staleTime: 1000 * 60 * 5, // 5 min — won't refetch if data is fresh
  });

  const handleRefresh = () => {
    // Invalidate so TanStack refetches, passing forceRefresh=true to bust server cache too
    void queryClient.fetchQuery({
      queryKey,
      queryFn: () => fetchAnalytics(mode, year, month, true),
    });
  };

  const yearOptions = useMemo(() => {
    const currentYear = now.getUTCFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear - i);
  }, [now]);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: new Date(Date.UTC(2026, i, 1)).toLocaleString("en-US", { month: "long" }),
      })),
    []
  );

  if (isLoading) return <Loader />;
  if (error) return <div className="text-red-500 p-10">{(error as Error).message}</div>;
  if (!data) return null;

  const { taskStatusCounts: tsc, totalUsers, archiveStats } = data;
  const compRate = tsc.total > 0 ? ((tsc.completed / tsc.total) * 100).toFixed(1) : "0";

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

      <Header lastRefresh={dataUpdatedAt} onRefresh={handleRefresh} />

      <main className="relative z-10 max-w-[90%] mx-auto p-6 flex flex-col gap-6">
        {/* Scope selector */}
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
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
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
                  {monthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex flex-col items-end gap-1">
              <button
                onClick={handleRefresh}
                className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-500/20"
              >
                Refresh
              </button>
              {data?.fromCache && data?.computedAt && (
                <span className="text-xs text-zinc-500">
                  cached · {new Date(data.computedAt).toLocaleString("en-IN", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              )}
              {data && !data.fromCache && (
                <span className="text-xs text-emerald-600">live</span>
              )}
            </div>
          </div>
        </section>

        {/* Stat cards */}
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