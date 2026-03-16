//pullFromServer, pullWorkspaceResource
import { authHeaders }      from "@/services/auth.service";
import { API_BASE }         from "./sync.config";
import { isBuiltInWorkspaceType } from "./sync.config";

export async function fetchWorkspaceId(
  workspaceType: string,
  token: string
): Promise<string | null> {
  if (!isBuiltInWorkspaceType(workspaceType)) return null;
  try {
    const res = await fetch(
      `${API_BASE}/tasks/workspace-id?workspaceType=${workspaceType}`,
      { headers: authHeaders(token) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.workspaceId ?? null;
  } catch {
    return null;
  }
}

export async function pullWorkspaceResource<T>({
  syncKey,
  deltaUrl,
  currentUrl,
  token,
  readDelta,
  mergeItems,
  pruneItems,
}: {
  syncKey:     string;
  deltaUrl:    string;
  currentUrl:  string;
  token:       string;
  readDelta:   (data: any) => { items: T[]; syncedAt: number };
  mergeItems:  (items: T[]) => Promise<void>;
  pruneItems:  (items: T[]) => Promise<number>;
}): Promise<boolean> {
  try {
    const deltaRes = await fetch(deltaUrl, { headers: authHeaders(token) });
    if (!deltaRes.ok) return false;

    const { items, syncedAt } = readDelta(await deltaRes.json());
    if (items.length > 0) await mergeItems(items);

    const currentRes   = await fetch(currentUrl, { headers: authHeaders(token) });
    const currentData  = currentRes.ok ? await currentRes.json() : {};
    const currentItems = currentData.tasks ?? currentData.sections ?? [];
    if (currentItems.length > 0) await mergeItems(currentItems);

    const pruned = await pruneItems(currentItems);
    localStorage.setItem(syncKey, String(syncedAt));
    return items.length > 0 || currentItems.length > 0 || pruned > 0;
  } catch {
    return false;
  }
}