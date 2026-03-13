/*
Purpose :Every time something inside a workspace changes—task CRUD, member added,
 archive restored—it -----> increments a version  counter,setup the lastChangedAt,updatedAt to now.... so every client knows “this workspace changed, you should resync.”

*/
import { Workspace } from "../models/Workspace.model.js";


//Purpose: convert whatever input you pass into a clean array of workspace IDs.eg:["ws1","ws2",....]
function normalizeWorkspaceIds(workspaceIds) {
  const list = Array.isArray(workspaceIds) ? workspaceIds : [workspaceIds];
  return [...new Set(list.map((id) => String(id ?? "").trim()).filter(Boolean))];
}


//Purpose: telling every client that a workspace has changed
export async function bumpWorkspaceSync(workspaceIds, options = {}) {
  const ids = normalizeWorkspaceIds(workspaceIds);
  if (!ids.length) return;

  const now = Date.now();
  await Workspace.updateMany(
    { workspaceId: { $in: ids } },
    {
      $inc: { syncVersion: 1 },
      $set: { lastChangedAt: now, updatedAt: now },
    },
    options.session ? { session: options.session } : undefined //if transaction exist while bumping,,do it in transactions or just do it simply
  );
}
