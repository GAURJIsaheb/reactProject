export interface Task {
  id: string;
  text: string;
  image: string | null;       // S3 key (stored in DB)
  imageUrl?: string | null;   // signed URL (for display)
  completed: boolean;
  archived: boolean;
  deleted: boolean;
  deletedAt?: number | null;
  sectionId?: string | null;
  createdAt: number;
  updatedAt: number;
  userEmail: string;
  workspaceType: string;
  syncStatus: 'synced' | 'pending';

    /**
   * Optimistic concurrency version — mirrors the server schema.
   * Starts at 1 on create, bumped on every local mutation.
   * The server rejects writes where incoming version !== storedVersion + 1.
   * Optional so existing IDB records without the field don't break.
   */
  version?: number;
}