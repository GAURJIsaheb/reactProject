import { useState, useCallback } from "react";
import { useAuthStore } from "@/zustand/authStore";
import { getTaskById } from "@/infrastructure/indexDb/idb";
import { useCollabWebSocket } from "@/hooks/useCollabWebSocket";
import { useWorkspaceState } from "@/hooks/useTasksEngine/useWorkspaceState";
import { useTaskSync } from "@/hooks/useTasksEngine/useTaskSync";
import { useTaskMutations } from "@/hooks/useTasksEngine/useTaskMutations";
import { useWsMessageHandler } from "@/hooks/useTasksEngine/useWsMessageHandler";
import type { Task } from "@/shared/types/task";

export type { SectionWsHandler } from "@/hooks/useTasksEngine/useWsMessageHandler";

export function useTasksEngine() {
  const { userEmail, token, userId } = useAuthStore();

  const [tasks, setTasks] = useState<Task[]>([]);

  const onTasksClear = useCallback(() => setTasks([]), []);

  const {
    workspace,
    setWorkspace,
    workspaceOptions,
    setWorkspaceOptions,
    activeWorkspaceOption,
    isDeletingWorkspace,
    addWorkspace,
    deleteWorkspace,
    refreshWorkspaceOptions,
  } = useWorkspaceState(onTasksClear);

  const currentWsId = activeWorkspaceOption?.id ?? null;
  const isSharedWorkspace = (activeWorkspaceOption?.memberCount ?? 1) > 1;
  const isCollabWorkspace = isSharedWorkspace;

  const { reloadTasks } = useTaskSync({
    userEmail,
    token,
    workspace,
    currentWsId,
    isCollabWorkspace,
    setTasks,
  });

  const { createTask, toggleComplete, deleteTask, editTask, moveTaskToSection } = useTaskMutations({
    userEmail,
    token,
    workspace,
    currentWsId,
    isCollabWorkspace,
    tasks,
    setTasks,
  });

  const { onMessage, registerSectionWsHandler } = useWsMessageHandler({
    userEmail,
    userId,
    workspace,
    currentWsId,
    isCollabWorkspace,
    tasks,
    workspaceOptions,
    activeWorkspaceOption,
    setTasks,
    setWorkspace,
    setWorkspaceOptions,
    refreshWorkspaceOptions,
    getTaskById: (id) => getTaskById(id).catch(() => null),
  });

  const { sendWs } = useCollabWebSocket({
    authToken: token,
    workspaceId: isSharedWorkspace ? currentWsId : null,
    onMessage,
  });

  return {
    tasks,
    workspace,
    setWorkspace,
    workspaceOptions,
    addWorkspace,
    deleteWorkspace,
    isDeletingWorkspace,
    createTask,
    toggleComplete,
    deleteTask,
    editTask,
    moveTaskToSection,
    reloadTasks,
    currentWsId,
    isSharedWorkspace,
    refreshWorkspaceOptions,
    sendWs,
    registerSectionWsHandler,
  };
}
