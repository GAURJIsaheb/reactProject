//Load + server sync logic
import { useCallback, useEffect } from "react";
import { useAuthStore } from "@/zustand/authStore";
import type { Section } from "@/shared/types/section";
import {
  getAllSections,
  upsertSection,
  pruneSyncedSectionsMissingOnServer,
} from "@/infrastructure/indexDb/idb";
import {
  fetchSections,
  createSectionApi,
  updateSectionApi,
} from "@/services/section.service";

interface UseSectionSyncParams {
  workspaceType:       string;
  effectiveWorkspaceId: string | null;
  sharedMode:          boolean;
  workspaceId:         string | null;
  setSections:         React.Dispatch<React.SetStateAction<Section[]>>;
}

export function useSectionSync({
  workspaceType,
  effectiveWorkspaceId,
  sharedMode,
  workspaceId,
  setSections,
}: UseSectionSyncParams) {
  const { token, userEmail } = useAuthStore();

  const syncDirtySections = useCallback(
    async (localSections: Section[]) => {
      if (!token) return;

      for (const section of localSections) {
        if (!section.dirty) continue;
        try {
          await createSectionApi(token, {
            id:            section.id,
            title:         section.title,
            workspaceType: section.workspaceType,
            order:         section.order,
            workspaceId:   effectiveWorkspaceId ?? undefined,
          });
        } catch {
          try {
            await updateSectionApi(token, section.id, {
              title:       section.title,
              order:       section.order,
              workspaceId: effectiveWorkspaceId ?? undefined,
            });
          } catch {
            continue;
          }
        }
        await upsertSection({ ...section, dirty: false, updatedAt: Date.now() });
      }
    },
    [effectiveWorkspaceId, token]
  );

  const loadSections = useCallback(async () => {
    if (!userEmail) return;

    if (sharedMode) {
      if (!workspaceId) { setSections([]); return; }
      const local = await getAllSections(userEmail, workspaceType, workspaceId);
      setSections(local);
      return;
    }

    // Optimistic: IDB first
    const local = await getAllSections(userEmail, workspaceType, effectiveWorkspaceId);
    setSections(local);

    if (!token) return;
    try {
      await syncDirtySections(local);

      const remote = await fetchSections(token, workspaceType, effectiveWorkspaceId ?? undefined);

      for (const s of remote) {
        await upsertSection({
          ...s,
          userEmail,
          workspaceType,
          ...(effectiveWorkspaceId ? { workspaceId: effectiveWorkspaceId } : {}),
        });
      }

      const serverIds = remote.map((s: Section) => s.id);
      await pruneSyncedSectionsMissingOnServer(
        userEmail, workspaceType, serverIds, effectiveWorkspaceId
      );

      const merged = await getAllSections(userEmail, workspaceType, effectiveWorkspaceId);
      setSections(merged);
    } catch {
      // Offline — keep IDB data
    }
  }, [
    token, userEmail, workspaceType, effectiveWorkspaceId,
    sharedMode, workspaceId, syncDirtySections, setSections,
  ]);

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

  return { loadSections };
}