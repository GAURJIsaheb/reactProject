//Task loading + online-recovery sync
import { useCallback, useEffect } from "react";
import { initDB } from "@/infrastructure/indexDb/idb";
import { getAllTasks as idbGetAllTasks } from "@/infrastructure/indexDb/idb";
import { processQueue } from "@/infrastructure/queue/syncQueue";
import { fetchWorkspaceId, pullFromServer } from "@/infrastructure/mongoSync/sync";
import { loadLocalTasks, loadWorkspaceTasks } from "../indexdbLayer";
import { isBuiltInWorkspace } from "./workspaceOptions";
import type { Task } from "@/shared/types/task";

interface UseTaskSyncParams {
  userEmail:         string | null;
  token:             string | null;
  workspace:         string;
  currentWsId:       string | null;
  isCollabWorkspace: boolean;
  setTasks:          React.Dispatch<React.SetStateAction<Task[]>>;
}

export function useTaskSync({
  userEmail,
  token,
  workspace,
  currentWsId,
  isCollabWorkspace,
  setTasks,
}: UseTaskSyncParams) {

  const reloadTasks = useCallback(async () => {
    if (!userEmail) return;

    const fresh = isCollabWorkspace
      ? await loadWorkspaceTasks(userEmail, workspace, currentWsId)
      : currentWsId
        ? await idbGetAllTasks(userEmail, workspace, currentWsId)
        : await loadLocalTasks(userEmail, workspace);

    setTasks(fresh);
  }, [currentWsId, isCollabWorkspace, setTasks, userEmail, workspace]);

  // Pull from server on workspace change
  useEffect(() => {
    if (!userEmail) return;

    (async () => {
      if (isCollabWorkspace) {
        await reloadTasks();
        return;
      }

      await initDB();
      if (token) {
        const resolvedId = currentWsId
          ?? (isBuiltInWorkspace(workspace) ? await fetchWorkspaceId(workspace, token) : null);
        if (resolvedId) {
          await pullFromServer(resolvedId, workspace, token, userEmail, Boolean(currentWsId));
        }
      }
      await reloadTasks();
    })();
  }, [currentWsId, isCollabWorkspace, reloadTasks, token, userEmail, workspace]);

  // Process offline queue when coming back online
  useEffect(() => {
    const handleOnline = async () => {
      if (!token) return;
      if (isCollabWorkspace) { await reloadTasks(); return; }
      await processQueue(token);
      await reloadTasks();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [isCollabWorkspace, reloadTasks, token]);

  return { reloadTasks };
}