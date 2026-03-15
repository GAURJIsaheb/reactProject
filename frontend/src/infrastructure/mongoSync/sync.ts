export { clearSyncTimestamps }                    from "./sync.timestamps";
export { fetchWorkspaceId, pullWorkspaceResource } from "./sync.pull";
export { pullSections, mergeSections }             from "./sync.sections";
export { pullTasks, mergeTasks }                   from "./sync.tasks";
export { pullNotifications }                       from "./sync.notifications";

// ─── Main orchestrator ────────────────────────────────────────────────────────
import { pullSections }      from "./sync.sections";
import { pullTasks }         from "./sync.tasks";
import { pullNotifications } from "./sync.notifications";

export async function pullFromServer(
  workspaceId:   string,
  workspaceType: string,
  token:         string,
  userEmail:     string,
  isCollab:      boolean = false
): Promise<boolean> {
  if (!navigator.onLine) return false;

  const [sectionsChanged, tasksChanged, notificationsChanged] = await Promise.all([
    pullSections(workspaceId, workspaceType, token, userEmail, isCollab),
    pullTasks(workspaceId, workspaceType, token, userEmail, isCollab),
    pullNotifications(workspaceType, token, userEmail),
  ]);

  return sectionsChanged || tasksChanged || notificationsChanged;
}