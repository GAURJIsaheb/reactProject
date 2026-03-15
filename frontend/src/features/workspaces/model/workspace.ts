export type WorkspaceOption = {
  value: string;
  label: string;
  emoji: string;
  id?: string;
  memberCount?: number;
  isOwner?: boolean;
};

export type ServerWorkspace = {
  workspaceId: string;
  name?: string;
  type: string;
  emoji?: string;
  memberCount?: number;
  isOwner?: boolean;
};

export const DEFAULT_WORKSPACES: WorkspaceOption[] = [
  { value: "personal", label: "Personal", emoji: "🪪", memberCount: 1, isOwner: true },
  { value: "professional", label: "Professional", emoji: "🧑🏻‍💼", memberCount: 1, isOwner: true },
];

