export interface Section {
  id:            string;
  workspaceType: string;
  userEmail:     string;
  title:         string;
  order:         number;
  createdAt:     number;
  updatedAt:     number;
  // Collab: links section to a server Workspace document
  workspaceId?:  string | null;
  // IDB-only: true = locally modified, not yet pushed to server
  dirty?:        boolean;
}