export interface Section {
  id: string;
  workspaceType: "personal" | "professional";
  userEmail: string;
  title: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}