//Incoming WS events for sections.
import { useCallback } from "react";
import type { Section } from "@/shared/types/section";
import { upsertSection, deleteSectionFromIDB } from "@/infrastructure/lib/idb";

interface UseSectionWsHandlerParams {
  userEmail:            string | null;
  workspaceType:        string;
  effectiveWorkspaceId: string | null;
  sharedMode:           boolean;
  sectionsRef:          React.MutableRefObject<Section[]>;
  setSections:          React.Dispatch<React.SetStateAction<Section[]>>;
}

export function useSectionWsHandler({
  userEmail,
  workspaceType,
  effectiveWorkspaceId,
  sharedMode,
  sectionsRef,
  setSections,
}: UseSectionWsHandlerParams) {

  const handleWsSection = useCallback(
    async (type: string, payload: unknown) => {
      if (type === "SECTION_CREATE" || type === "SECTION_UPDATE") {
        const incoming = payload as Section;

        const existing = sectionsRef.current.find((s) => s.id === incoming.id);
        if (existing && existing.updatedAt >= incoming.updatedAt) return;

        const toSave: Section = {
          ...incoming,
          userEmail:    userEmail!,
          workspaceType,
          ...(effectiveWorkspaceId ? { workspaceId: effectiveWorkspaceId } : {}),
        };
        await upsertSection({ ...toSave, dirty: false });
        setSections((prev) =>
          [...prev.filter((s) => s.id !== incoming.id), toSave]
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        );
      }

      if (type === "SECTION_DELETE") {
        const sectionId = payload as string;
        if (!sharedMode) await deleteSectionFromIDB(sectionId);
        setSections((prev) => prev.filter((s) => s.id !== sectionId));
      }
    },
    [effectiveWorkspaceId, userEmail, workspaceType, sharedMode, sectionsRef]
  );

  return { handleWsSection };
}