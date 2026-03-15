//WebSocket message dispatch
import { useRef, useCallback } from "react";
import { toast } from "sonner";
import { clearWorkspaceDataFromIDB } from "@/infrastructure/indexDb/idb";
import { addTask as idbAddTask, deleteTaskFromIDB } from "@/infrastructure/indexDb/idb";
import { normalizeSubtasks } from "@/shared/lib/subtasks";
import type { Task } from "@/shared/types/task";
import type { WorkspaceOption } from "@/features/workspaces/model/workspace";

export type SectionWsHandler = (type: string, payload: unknown) => Promise<void>;

interface WsMessageHandlerParams {
  userEmail:             string | null;
  userId:                string | null;
  workspace:             string;
  currentWsId:           string | null;
  isCollabWorkspace:     boolean;
  tasks:                 Task[];
  workspaceOptions:      WorkspaceOption[];
  activeWorkspaceOption: WorkspaceOption | null;
  setTasks:              React.Dispatch<React.SetStateAction<Task[]>>;
  setWorkspace:          (ws: string) => void;
  setWorkspaceOptions:   React.Dispatch<React.SetStateAction<WorkspaceOption[]>>;
  refreshWorkspaceOptions: () => Promise<void>;
  getTaskById:           (id: string) => Promise<Task | null>;
}

export function useWsMessageHandler({
  userEmail, userId, workspace, currentWsId, isCollabWorkspace,
  tasks, workspaceOptions, activeWorkspaceOption,
  setTasks, setWorkspace, setWorkspaceOptions,
  refreshWorkspaceOptions, getTaskById,
}: WsMessageHandlerParams) {

  const sectionWsHandlerRef = useRef<SectionWsHandler | null>(null);

  const registerSectionWsHandler = useCallback((handler: SectionWsHandler) => {
    sectionWsHandlerRef.current = handler;
  }, []);

  const onMessage = useCallback(async (msg: Record<string, unknown> & { type: string }) => {
    switch (msg.type) {
      case "TASK_CREATE":
      case "TASK_UPDATE": {
        const incoming = {
          ...(msg.task as Task),
          subtasks: normalizeSubtasks((msg.task as Task)?.subtasks),
        };
        if (currentWsId) {
          if (incoming.workspaceId !== currentWsId) break;
        } else if (incoming.workspaceType !== workspace) {
          break;
        }

        const local = isCollabWorkspace
          ? tasks.find((t) => t.id === incoming.id) ?? null
          : await getTaskById(incoming.id).catch(() => null);

        if (!local || incoming.updatedAt > local.updatedAt) {
          const toSave = {
            ...incoming,
            syncStatus: "synced" as const,
            dirty:      false,
            ...(currentWsId ? { workspaceId: currentWsId } : {}),
          };
          await idbAddTask(toSave);
          setTasks((prev) => [...prev.filter((t) => t.id !== incoming.id), toSave]);
        }
        break;
      }

      case "TASK_DELETE":
        await deleteTaskFromIDB(msg.taskId as string);
        setTasks((prev) => prev.filter((t) => t.id !== msg.taskId));
        break;

      case "SECTION_CREATE":
      case "SECTION_UPDATE":
        await sectionWsHandlerRef.current?.(msg.type, msg.section);
        break;

      case "SECTION_DELETE":
        await sectionWsHandlerRef.current?.(msg.type, msg.sectionId);
        break;

      case "MEMBER_JOINED":
        void refreshWorkspaceOptions();
        window.dispatchEvent(new CustomEvent("workspace-members-changed", { detail: { workspaceId: msg.workspaceId } }));
        toast.info(`${(msg.name as string) || (msg.email as string)} joined the workspace`);
        break;

      case "MEMBER_REMOVED":
        void refreshWorkspaceOptions();
        window.dispatchEvent(new CustomEvent("workspace-members-changed", { detail: { workspaceId: msg.workspaceId } }));
        if (msg.userId === userId) {
          if (currentWsId) await clearWorkspaceDataFromIDB(userEmail ?? "", workspace, currentWsId);
          setWorkspaceOptions((prev) => prev.filter((o) => o.id !== msg.workspaceId));
          setWorkspace("personal");
          toast.warning("You were removed from this workspace");
        }
        break;

      case "WORKSPACE_DELETED":
        void refreshWorkspaceOptions();
        window.dispatchEvent(new CustomEvent("workspace-members-changed", { detail: { workspaceId: msg.workspaceId } }));
        if (userEmail && msg.workspaceId) {
          const removed = workspaceOptions.find((o) => o.id === msg.workspaceId);
          if (removed) await clearWorkspaceDataFromIDB(userEmail, removed.value, msg.workspaceId as string);
        }
        setWorkspaceOptions((prev) => prev.filter((o) => o.id !== msg.workspaceId));
        if (currentWsId === msg.workspaceId || activeWorkspaceOption?.id === msg.workspaceId) {
          setTasks([]);
          setWorkspace("personal");
          toast.warning("Workspace was deleted");
        }
        break;

      default:
        break;
    }
  }, [
    activeWorkspaceOption?.id, currentWsId, getTaskById, isCollabWorkspace,
    refreshWorkspaceOptions, setTasks, setWorkspace, setWorkspaceOptions,
    tasks, userId, userEmail, workspace, workspaceOptions,
  ]);

  return { onMessage, registerSectionWsHandler };
}