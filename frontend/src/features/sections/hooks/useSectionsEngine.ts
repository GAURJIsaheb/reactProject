import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/zustand/authStore";
import type { Section } from "@/shared/types/section";
import { readCachedSections, writeCachedSections } from "@/infrastructure/cache/workspaceCache";
import { useSectionSync } from "@/hooks/useSectionEngine/useSectionSync";
import { useSectionMutations } from "@/hooks/useSectionEngine/useSectionMutations";
import { useSectionWsHandler } from "@/hooks/useSectionEngine/useSectionWsHandler";

type SendWsFn = (msg: object) => void;

type Props = {
  workspaceType: string;
  workspaceId: string | null;
  sharedMode: boolean;
  sendWs: SendWsFn;
};

export function useSectionsEngine({ workspaceType, workspaceId, sharedMode, sendWs }: Props) {
  const { userEmail } = useAuthStore();
  const effectiveWorkspaceId = workspaceId ?? null;

  const [sections, setSections] = useState<Section[]>(() => {
    if (!userEmail) return [];
    return readCachedSections(userEmail, workspaceType, effectiveWorkspaceId);
  });

  const sectionsRef = useRef<Section[]>(sections);
  sectionsRef.current = sections;

  useEffect(() => {
    if (!userEmail) return;
    const cached = readCachedSections(userEmail, workspaceType, effectiveWorkspaceId);
    setSections(cached.length > 0 ? cached : []);
  }, [userEmail, workspaceType, effectiveWorkspaceId]);

  useEffect(() => {
    if (!userEmail) return;
    writeCachedSections(userEmail, workspaceType, sections, effectiveWorkspaceId);
  }, [effectiveWorkspaceId, sections, userEmail, workspaceType]);

  const { loadSections } = useSectionSync({
    workspaceType,
    effectiveWorkspaceId,
    sharedMode,
    workspaceId,
    setSections,
  });

  const { createSection, renameSection, deleteSection, reorderSections } = useSectionMutations({
    workspaceType,
    workspaceId,
    effectiveWorkspaceId,
    sharedMode,
    sendWs,
    sections,
    sectionsRef,
    setSections,
  });

  const { handleWsSection } = useSectionWsHandler({
    userEmail,
    workspaceType,
    effectiveWorkspaceId,
    sharedMode,
    sectionsRef,
    setSections,
  });

  return {
    sections,
    createSection,
    renameSection,
    deleteSection,
    reorderSections,
    loadSections,
    handleWsSection,
  };
}
