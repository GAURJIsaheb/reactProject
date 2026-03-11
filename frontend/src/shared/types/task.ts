
export interface Task {
  id:            string;
  text:          string;
  labels:        string[];
  completed:     boolean;
  archived:      boolean;
  deleted:       boolean;
  deletedAt:     number | null;
  image:         string | null;
  imageUrl?:     string | null;
  imageUrlExpiry?: number | null;
  reminderAt?:   number | null;
  sectionId:     string | null;
  createdAt:     number;
  updatedAt:     number;
  userEmail:     string;
  workspaceType: string;
  /** Server-side workspace UUID — set for collab workspaces so IDB byWorkspaceId index works */
  workspaceId?:  string | null;
  syncStatus:    "pending" | "synced";
  version:       number;
  dirty?:        boolean;
}
