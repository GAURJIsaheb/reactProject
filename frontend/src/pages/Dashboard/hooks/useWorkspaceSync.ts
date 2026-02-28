import { useEffect } from "react";
import { processQueue } from "@/infrastructure/queue/syncQueue";
import { pullFromServer, fetchWorkspaceId } from "@/infrastructure/mongoSync/sync";

export function useWorkspaceSync(
  workspace: string,
  token: string | null,
  userEmail: string | null,
  setWorkspaceId: (id: string | null) => void,
  workspaceId: string | null,
  reloadTasks: () => Promise<void>,
  loadSections: () => Promise<void>
) {
  // resolve workspaceId
  useEffect(() => {
    if (!token) return;

    setWorkspaceId(null);

    fetchWorkspaceId(workspace, token).then(id => {
      setWorkspaceId(id);
    });
  }, [workspace, token]);

  // delta loop
  useEffect(() => {
    if (!token || !workspaceId) return;

    let cancelled = false;

    const run = async () => {
      if (cancelled) return;

      await processQueue(token);

      const hasNew = await pullFromServer(
        workspaceId,
        workspace,
        token,
        userEmail ?? ""
      );

      if (hasNew && !cancelled) {
        await reloadTasks();
        await loadSections();
      }
    };

    run();

    const interval = setInterval(run, 30000);
    const onFocus = () => run();

    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [token, workspaceId]);
}