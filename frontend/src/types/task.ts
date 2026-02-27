export interface Task {
  id: string;
  text: string;
  completed: boolean;
  archived: boolean;
  deleted?: boolean;
  deletedAt:     number | null; 

  image?: string | null;

  createdAt: number;
  updatedAt?: number;

  userEmail: string;
  userName?: string;

  workspaceType: string;
  syncStatus: "pending" | "synced";

  sectionId: string | null; 
}