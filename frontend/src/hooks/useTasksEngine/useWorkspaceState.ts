//All workspace state + CRUD 
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { clearWorkspaceDataFromIDB } from "@/infrastructure/lib/idb";
import { useAuthStore } from "@/zustand/authStore";
import { workspaceStorageKey as workspaceKey } from "@/features/workspaces/lib/workspaceOptions";
import {
  createServerWorkspace,
  deleteWorkspace as deleteWorkspaceApi,
  listMyWorkspaces,
} from "@/services/workspace.service";
import { writeCachedWorkspaceOptions } from "@/infrastructure/cache/workspaceCache";
import type { WorkspaceOption } from "@/features/workspaces/model/workspace";
import {
  DEFAULT_WORKSPACES,
  getInitialWorkspaceOptions,
  isBuiltInWorkspace,
  mergeWorkspaceOptions,
  toWorkspaceValue,
} from "./workspaceOptions";

function requireOnline(action: string): boolean {
  if (!navigator.onLine) {
    toast.warning(`You're offline. "${action}" requires an internet connection.`);
    return false;
  }
  return true;
}

export function useWorkspaceState(onTasksClear: () => void) {
  const { userEmail, token } = useAuthStore();

  const [workspaceOptions, setWorkspaceOptions] = useState<WorkspaceOption[]>(() =>
    userEmail ? getInitialWorkspaceOptions(userEmail) : DEFAULT_WORKSPACES
  );
  const [workspace, setWorkspace] = useState<string>(() =>
    userEmail ? localStorage.getItem(workspaceKey(userEmail)) ?? "personal" : "personal"
  );
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);

  // Re-init on user change
  useEffect(() => {
    if (!userEmail) return;
    setWorkspaceOptions(getInitialWorkspaceOptions(userEmail));
    setWorkspace(localStorage.getItem(workspaceKey(userEmail)) ?? "personal");
  }, [userEmail]);

  // Persist active workspace to localStorage
  useEffect(() => {
    if (!userEmail) return;
    localStorage.setItem(workspaceKey(userEmail), workspace);
  }, [workspace, userEmail]);

  // Persist workspace options to cache
  useEffect(() => {
    if (!userEmail) return;
    writeCachedWorkspaceOptions(userEmail, workspaceOptions);
  }, [workspaceOptions, userEmail]);

  // Fallback to personal if active workspace disappears
  useEffect(() => {
    if (!workspaceOptions.some((o) => o.value === workspace)) {
      setWorkspace("personal");
    }
  }, [workspace, workspaceOptions]);

  const refreshWorkspaceOptions = useCallback(async () => {
    if (!userEmail || !token || !navigator.onLine) return;
    try {
      const { workspaces } = await listMyWorkspaces(token);
      setWorkspaceOptions((prev) => mergeWorkspaceOptions(prev, workspaces));
    } catch {}
  }, [token, userEmail]);

  // Initial fetch + focus/online listeners
  useEffect(() => { void refreshWorkspaceOptions(); }, [refreshWorkspaceOptions]);

  useEffect(() => {
    if (!token) return;
    const sync = () => { void refreshWorkspaceOptions(); };
    window.addEventListener("focus",  sync);
    window.addEventListener("online", sync);
    return () => {
      window.removeEventListener("focus",  sync);
      window.removeEventListener("online", sync);
    };
  }, [refreshWorkspaceOptions, token]);

  // Handle ?workspace=id deep-link
  useEffect(() => {
    const params   = new URLSearchParams(window.location.search);
    const targetId = params.get("workspace");
    if (!targetId) return;

    const match = workspaceOptions.find((o) => o.id === targetId);
    if (match) {
      setWorkspace(match.value);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    void refreshWorkspaceOptions();
  }, [refreshWorkspaceOptions, workspaceOptions]);

  const addWorkspace = useCallback(async (name: string, emoji = "📁") => {
    const trimmed = name.trim();
    if (!trimmed || !userEmail || !token) return false;
    if (!requireOnline("Add Workspace"))    return false;

    let serverId: string;
    try {
      const res = await createServerWorkspace(trimmed, emoji, token);
      serverId  = res.workspaceId;
    } catch {
      toast.error("Could not create workspace on server. Please try again.");
      return false;
    }

    let nextValue = toWorkspaceValue(trimmed);
    setWorkspaceOptions((prev) => {
      const base    = toWorkspaceValue(trimmed);
      let value     = base;
      let suffix    = 2;
      const existing = new Set(prev.map((o) => o.value));
      while (existing.has(value)) { value = `${base}-${suffix}`; suffix++; }
      nextValue = value;
      return [...prev, { value, label: trimmed, emoji: emoji.trim() || "📁", id: serverId, memberCount: 1, isOwner: true }];
    });

    setWorkspace(nextValue);
    return true;
  }, [token, userEmail]);

  const activeWorkspaceOption = workspaceOptions.find((o) => o.value === workspace) ?? null;

  const deleteWorkspace = useCallback(async () => {
    if (!userEmail || !token || !activeWorkspaceOption?.id)           return false;
    if (isBuiltInWorkspace(activeWorkspaceOption.value))              return false;
    if ((activeWorkspaceOption.memberCount ?? 1) > 1 && !activeWorkspaceOption.isOwner) return false;
    if (!requireOnline("Delete Workspace"))                           return false;

    setIsDeletingWorkspace(true);
    try {
      await deleteWorkspaceApi(activeWorkspaceOption.id, token);
      await clearWorkspaceDataFromIDB(userEmail, activeWorkspaceOption.value, activeWorkspaceOption.id);
      setWorkspaceOptions((prev) => prev.filter((o) => o.value !== activeWorkspaceOption.value));
      onTasksClear();
      setWorkspace("personal");
      toast.success("Workspace deleted");
      return true;
    } catch {
      toast.error("Workspace delete failed");
      return false;
    } finally {
      setIsDeletingWorkspace(false);
    }
  }, [activeWorkspaceOption, onTasksClear, token, userEmail]);

  return {
    workspace,
    setWorkspace,
    workspaceOptions,
    setWorkspaceOptions,
    activeWorkspaceOption,
    isDeletingWorkspace,
    addWorkspace,
    deleteWorkspace,
    refreshWorkspaceOptions,
  };
}