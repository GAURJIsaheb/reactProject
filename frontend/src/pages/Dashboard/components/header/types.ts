import type { WorkspaceOption } from "@/hooks/useTasksEngine";

export type ReminderNotification = {
  id: string;
  taskId: string;
  taskText: string;
  dueAt: number;
  read: boolean;
  source: "reminder" | "completion";
};

export type HeaderProps = {
  workspace: string;
  setWorkspace: (v: string) => void;
  workspaceOptions: WorkspaceOption[];
  onAddWorkspace: (name: string, emoji: string) => void;

  userName?: string | null;
  theme: string;
  toggleTheme: () => void;
  logout: () => void;

  notifications: ReminderNotification[];
  onMarkAllRead: () => void;
  onDismissNotification: (n: ReminderNotification) => void;
};