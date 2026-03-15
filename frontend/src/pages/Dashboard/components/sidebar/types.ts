import type { WorkspaceOption } from "@/features/workspaces/model/workspace";

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
  onDeleteWorkspace: () => Promise<boolean>;
  isDeletingWorkspace: boolean;

  userName?: string | null;
  theme: string;
  toggleTheme: () => void;
  logout: () => void;

  notifications: ReminderNotification[];
  onMarkAllRead: () => void;
  onDismissNotification: (n: ReminderNotification) => void;
};
