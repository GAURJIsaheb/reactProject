import { openDB } from "idb";

const DB_NAME    = "MyTodoApp";
const DB_VERSION = 9;

export const STORE_TASKS         = "tasks";
export const STORE_USER          = "user";
export const STORE_SYNC          = "syncQueue";
export const STORE_ARCHIVE       = "archives";
export const STORE_SECTIONS      = "sections";
export const STORE_NOTIFICATIONS = "notifications";

export const IDX_TASKS_BY_USER_WORKSPACE_DELETED = "byUserWorkspaceDeleted";
export const IDX_TASKS_BY_WORKSPACE_ID           = "byWorkspaceId";
export const IDX_SECTIONS_BY_USER_WORKSPACE      = "byUserWorkspace";
export const IDX_SECTIONS_BY_WORKSPACE_ID        = "byWorkspaceId";
export const IDX_NOTIFICATIONS_BY_USER_WORKSPACE = "byUserWorkspace";

export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, _oldVersion, _newVersion, tx) {

      // Tasks
      if (!db.objectStoreNames.contains(STORE_TASKS)) {
        const s = db.createObjectStore(STORE_TASKS, { keyPath: "id" });
        s.createIndex(IDX_TASKS_BY_USER_WORKSPACE_DELETED, ["userEmail", "workspaceType", "deleted"]);
        s.createIndex(IDX_TASKS_BY_WORKSPACE_ID, "workspaceId");
      } else {
        const s = tx.objectStore(STORE_TASKS);
        if (!s.indexNames.contains(IDX_TASKS_BY_USER_WORKSPACE_DELETED))
          s.createIndex(IDX_TASKS_BY_USER_WORKSPACE_DELETED, ["userEmail", "workspaceType", "deleted"]);
        if (!s.indexNames.contains(IDX_TASKS_BY_WORKSPACE_ID))
          s.createIndex(IDX_TASKS_BY_WORKSPACE_ID, "workspaceId");
      }

      // User
      if (!db.objectStoreNames.contains(STORE_USER))
        db.createObjectStore(STORE_USER, { keyPath: "userId" });

      // Sync queue
      if (!db.objectStoreNames.contains(STORE_SYNC)) {
        const s = db.createObjectStore(STORE_SYNC, { keyPath: "id" });
        s.createIndex("byRetry", "retry");
      }

      // Sections
      if (!db.objectStoreNames.contains(STORE_SECTIONS)) {
        const s = db.createObjectStore(STORE_SECTIONS, { keyPath: "id" });
        s.createIndex("byWorkspace",                  "workspaceType");
        s.createIndex(IDX_SECTIONS_BY_USER_WORKSPACE, ["userEmail", "workspaceType"]);
        s.createIndex(IDX_SECTIONS_BY_WORKSPACE_ID,   "workspaceId");
      } else {
        const s = tx.objectStore(STORE_SECTIONS);
        if (!s.indexNames.contains(IDX_SECTIONS_BY_USER_WORKSPACE))
          s.createIndex(IDX_SECTIONS_BY_USER_WORKSPACE, ["userEmail", "workspaceType"]);
        if (!s.indexNames.contains(IDX_SECTIONS_BY_WORKSPACE_ID))
          s.createIndex(IDX_SECTIONS_BY_WORKSPACE_ID, "workspaceId");
      }

      // Archive
      if (!db.objectStoreNames.contains(STORE_ARCHIVE))
        db.createObjectStore(STORE_ARCHIVE, { keyPath: "id" });

      // Notifications
      if (!db.objectStoreNames.contains(STORE_NOTIFICATIONS)) {
        const n = db.createObjectStore(STORE_NOTIFICATIONS, { keyPath: "id" });
        n.createIndex("byWorkspace",                       "workspaceType");
        n.createIndex(IDX_NOTIFICATIONS_BY_USER_WORKSPACE, ["userEmail", "workspaceType"]);
      } else {
        const n = tx.objectStore(STORE_NOTIFICATIONS);
        if (!n.indexNames.contains(IDX_NOTIFICATIONS_BY_USER_WORKSPACE))
          n.createIndex(IDX_NOTIFICATIONS_BY_USER_WORKSPACE, ["userEmail", "workspaceType"]);
      }
    },
  });
}