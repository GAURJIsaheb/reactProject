import { useEffect, useRef } from "react";
import { processQueue } from "@/infrastructure/queue/syncQueue";
import { pullFromServer, fetchWorkspaceId } from "@/infrastructure/mongoSync/sync";
import { getWorkspaceSyncState } from "@/services/workspace.service";

const SHARED_SYNC_CHECK_INTERVAL_MS = 120000;

function isBuiltInWorkspaceType(workspace: string) {
  return workspace === "personal" || workspace === "professional";
}

export function useWorkspaceSync(
  workspace: string,
  setWorkspace: (workspace: string) => void,
  token: string | null,
  userEmail: string | null,
  isSharedWorkspace: boolean,
  currentWsId: string | null,
  setWorkspaceId: (id: string | null) => void,
  workspaceId: string | null,
  reloadTasks: () => Promise<void>,
  loadSections: () => Promise<void>,
  reloadNotifications: () => Promise<void>,
  refreshWorkspaceOptions: () => Promise<void>
) {
  const sharedSyncRef = useRef<{ syncVersion: number; lastChangedAt: number } | null>(null);

  // resolve workspaceId
  useEffect(() => {
    if (!token) return;

    if (currentWsId) {
      setWorkspaceId(currentWsId);
      return;
    }

    setWorkspaceId(null);
    if (!isBuiltInWorkspaceType(workspace)) return;

    fetchWorkspaceId(workspace, token).then(id => {
      setWorkspaceId(id);
    });
  }, [workspace, token, currentWsId, setWorkspaceId]);

  // delta loop
  useEffect(() => {
    if (!token || !workspaceId) return;

    let cancelled = false;

    const hydrateSharedWorkspace = async () => {
      await refreshWorkspaceOptions();
      await pullFromServer(
        workspaceId,
        workspace,
        token,
        userEmail ?? "",
        true
      );
      if (cancelled) return;
      await reloadTasks();
      await loadSections();
      await reloadNotifications();
    };

    const syncSharedWorkspace = async (force = false) => {
      try {
        const state = await getWorkspaceSyncState(workspaceId, token);
        if (cancelled) return;

        await hydrateSharedWorkspace();

        sharedSyncRef.current = {
          syncVersion: state.syncVersion,
          lastChangedAt: state.lastChangedAt,
        };
      } catch (error: any) {
        await refreshWorkspaceOptions();
        if (error?.status === 403 || error?.status === 404) {
          if (cancelled) return;
          setWorkspaceId(null);
          setWorkspace("personal");
          return;
        }
        if (force) {
          await hydrateSharedWorkspace();
        }
      }
    };

    const run = async () => {
      if (cancelled) return;
      if (isSharedWorkspace) {
        await syncSharedWorkspace();
        return;
      }

      await refreshWorkspaceOptions();
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
        await reloadNotifications();
      }
    };

    if (isSharedWorkspace) {
      sharedSyncRef.current = null;
      syncSharedWorkspace(true);
    } else {
      run();
    }

    const interval = setInterval(
      () => {
        if (isSharedWorkspace) {
          syncSharedWorkspace();
          return;
        }
        run();
      },
      isSharedWorkspace ? SHARED_SYNC_CHECK_INTERVAL_MS : 30000
    );
    const onFocus = () => {
      if (isSharedWorkspace) {
        syncSharedWorkspace();
        return;
      }
      run();
    };
    const onOnline = () => {
      if (isSharedWorkspace) {
        syncSharedWorkspace(true);
        return;
      }
      run();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [token, workspaceId, workspace, userEmail, reloadTasks, loadSections, reloadNotifications, refreshWorkspaceOptions, isSharedWorkspace, setWorkspaceId, setWorkspace]);
}
