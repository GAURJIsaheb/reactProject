// Completion chart
export type CompletionPoint = {
  _id: string;
  rate: number;
};

// Growth chart (last 30 days)
export type GrowthPoint = {
  _id: string;
  count: number;
};

// Activity by hour
export type HourData = {
   _id: number;
  count: number;
};

export type TaskStatusSlice = {
  name: string;
  value: number;
  color: string;
};

// Activity by day
export type DayData = {
  _id:number;
  count: number;
};

// Tasks per user
export type TaskPerUser = {
  name: string;
  count: number;
  completed: number;
};

// Top users list
export type TopUser = {
  name?: string;
  email?: string;
  taskCount: number;
  avgVersion?: number;
  lastActive: number;
};

// Activity feed item
export type ActivityItem = {
  text?: string;
  name?: string;
  email?: string;
  updatedAt: number;
  completed?: boolean;
  archived?: boolean;
};

export type TooltipPayloadItem = {
  name?: string;
  value?: number | string;
  color?: string;
  fill?: string;  
};





export type AnalyticsMode = "month" | "year";

export type AnalyticsResponse = {
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
  fromCache?: boolean;
  computedAt?: number;
};
