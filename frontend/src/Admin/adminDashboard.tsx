import { useQuery } from "@tanstack/react-query";

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

type AnalyticsResponse = {
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

// ── fetcher function (outside component so it's stable) ──────────────────────
const fetchAnalytics = async (): Promise<AnalyticsResponse> => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API}/admin/analytics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export default function AdminDashboard() {
  const {
    data,
    isLoading,
    isError,
    error,
    dataUpdatedAt,
    refetch,
  } = useQuery<AnalyticsResponse, Error>({
    queryKey: ["admin-analytics"],
    queryFn: fetchAnalytics,
    staleTime: 1000 * 60 * 2,      // treat data as fresh for 2 min
    refetchOnWindowFocus: false,    // don't auto-refetch on tab switch
  });

  if (isLoading) return <Loader />;
  if (isError) return <div className="text-red-500 p-10">{error.message}</div>;
  if (!data) return null;

  const { taskStatusCounts: tsc, totalUsers, archiveStats } = data;

  const compRate =
    tsc.total > 0 ? ((tsc.completed / tsc.total) * 100).toFixed(1) : "0";

  const pieData = [
    { name: "Active",     value: tsc.active,    color: NEON.cyan   },
    { name: "Completed",  value: tsc.completed, color: NEON.green  },
    { name: "Archived",   value: tsc.archived,  color: NEON.purple },
    { name: "Deleted",    value: tsc.deleted,   color: NEON.pink   },
  ];

  return (
    <div className="min-h-screen  bg-[#080808] text-white relative font-mono">
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

      {/* pass refetch directly — no manual setLastRefresh needed */}
      <Header lastRefresh={dataUpdatedAt} onRefresh={refetch} />

      <main className="relative z-10 max-w-[90%] mx-auto p-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <StatCard label="Total Users"  value={totalUsers}         icon={Users}        color={NEON.cyan}   sub="registered accounts"      />
          <StatCard label="Total Tasks"  value={tsc.total}          icon={Activity}     color={NEON.purple}                                  />
          <StatCard label="Active Tasks" value={tsc.active}         icon={Zap}          color={NEON.orange}                                  />
          <StatCard label="Completed"    value={tsc.completed}      icon={CheckCircle2} color={NEON.green}  sub={`${compRate}% completion`} />
          <StatCard label="Archived"     value={archiveStats.total} icon={Archive}      color={NEON.blue}                                    />
          <StatCard label="With Images"  value={tsc.withImage}      icon={Eye}          color={NEON.pink}                                    />
        </div>

        <GrowthChart      data={data.growthOverTime}  />
        <TaskPie          pieData={pieData}            />
        <HourChart        data={data.activityByHour}  />
        <DayChart         data={data.activityByDay}   />
        <TasksPerUserChart data={data.taskPerUser}    />
        <TopUsers         topUsers={data.topUsers}    />
        <ActivityFeed     recentActivity={data.recentActivity} />
      </main>
    </div>
  );
}