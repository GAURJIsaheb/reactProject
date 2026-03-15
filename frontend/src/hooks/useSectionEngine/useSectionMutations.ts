//All Sections CRUD + reorder logic
import { useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useAuthStore } from "@/zustand/authStore";
import type { Section } from "@/shared/types/section";
import { upsertSection, deleteSectionFromIDB } from "@/infrastructure/indexDb/idb";
import {
  createSectionApi,
  updateSectionApi,
  deleteSectionApi,
} from "@/services/section.service";
import { requireOnline } from "./sectionOptions";

type SendWsFn = (msg: object) => void;

interface UseSectionMutationsParams {
  workspaceType:        string;
  workspaceId:          string | null;
  effectiveWorkspaceId: string | null;
  sharedMode:           boolean;
  sendWs:               SendWsFn;
  sections:             Section[];
  sectionsRef:          React.MutableRefObject<Section[]>;
  setSections:          React.Dispatch<React.SetStateAction<Section[]>>;
}

export function useSectionMutations({
  workspaceType,
  workspaceId,
  effectiveWorkspaceId,
  sharedMode,
  sendWs,
  sections,
  sectionsRef,
  setSections,
}: UseSectionMutationsParams) {
  const { token, userEmail } = useAuthStore();
  const pendingSectionCreatesRef = useRef<Set<string>>(new Set());

  const createSection = useCallback(
    async (title: string) => {
      if (!userEmail) return;
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return;

      const requestKey = `${sharedMode ? workspaceId ?? "shared" : workspaceType}:${trimmedTitle.toLowerCase()}`;
      if (pendingSectionCreatesRef.current.has(requestKey)) return;
      if (sharedMode && !requireOnline("Add Section")) return;

      if (sharedMode) {
        if (!token || !workspaceId) return;
        pendingSectionCreatesRef.current.add(requestKey);
        try {
          const created = await createSectionApi(token, {
            id:            uuidv4(),
            title:         trimmedTitle,
            workspaceType,
            order:         sections.length,
            workspaceId,
          });
          const nextSection: Section = {
            ...created,
            userEmail:     created.userEmail || userEmail,
            workspaceType,
            workspaceId,
            dirty:         false,
          };
          await upsertSection(nextSection);
          setSections((prev) =>
            [...prev.filter((s) => s.id !== nextSection.id), nextSection]
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          );
        } catch {
          toast.error("Section couldn't be created");
        } finally {
          pendingSectionCreatesRef.current.delete(requestKey);
        }
        return;
      }

      pendingSectionCreatesRef.current.add(requestKey);
      const newSection: Section = {
        id:            uuidv4(),
        title:         trimmedTitle,
        workspaceType: workspaceType as Section["workspaceType"],
        userEmail,
        order:         sections.length,
        createdAt:     Date.now(),
        updatedAt:     Date.now(),
        dirty:         true,
      };

      await upsertSection(newSection);
      setSections((prev) => [...prev, newSection]);

      if (token) {
        try {
          await createSectionApi(token, {
            id:            newSection.id,
            title:         newSection.title,
            workspaceType: newSection.workspaceType,
            order:         newSection.order,
            workspaceId:   effectiveWorkspaceId ?? undefined,
          });
          if (sharedMode && workspaceId) {
            sendWs({ type: "SECTION_CREATE", workspaceId, section: newSection });
          }
          await upsertSection({ ...newSection, dirty: false });
        } catch {
          if (sharedMode) toast.error("Section couldn't sync. Reload to check consistency.");
        } finally {
          pendingSectionCreatesRef.current.delete(requestKey);
        }
      } else {
        pendingSectionCreatesRef.current.delete(requestKey);
      }
    },
    [token, userEmail, workspaceType, workspaceId, effectiveWorkspaceId, sections.length, sendWs, sharedMode]
  );

  const renameSection = useCallback(
    async (sectionId: string, title: string) => {
      if (sharedMode && !requireOnline("Rename Section")) return;

      if (sharedMode) {
        if (!token || !workspaceId) return;
        const existing = sectionsRef.current.find((s) => s.id === sectionId);
        if (!existing) return;
        try {
          await updateSectionApi(token, sectionId, { title, workspaceId });
          const updated = { ...existing, title, updatedAt: Date.now(), dirty: false };
          await upsertSection(updated);
          setSections((prev) => prev.map((s) => (s.id === sectionId ? updated : s)));
        } catch {
          toast.error("Section rename failed");
        }
        return;
      }

      const patch = { title, updatedAt: Date.now(), dirty: true };
      setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)));

      const existing = sectionsRef.current.find((s) => s.id === sectionId);
      if (existing) await upsertSection({ ...existing, ...patch });

      if (token) {
        try {
          await updateSectionApi(token, sectionId, {
            title,
            workspaceId: effectiveWorkspaceId ?? undefined,
          });
          if (existing) await upsertSection({ ...existing, ...patch, dirty: false });
          if (sharedMode && workspaceId) {
            sendWs({ type: "SECTION_UPDATE", workspaceId, section: { ...existing, ...patch } });
          }
        } catch {}
      }
    },
    [effectiveWorkspaceId, token, workspaceId, sendWs, sharedMode, sectionsRef]
  );

  const deleteSection = useCallback(
    async (sectionId: string) => {
      if (sharedMode && !requireOnline("Delete Section")) return;

      if (sharedMode) {
        if (!token || !workspaceId) return;
        try {
          await deleteSectionApi(token, sectionId, workspaceId);
          await deleteSectionFromIDB(sectionId);
          setSections((prev) => prev.filter((s) => s.id !== sectionId));
        } catch {
          toast.error("Section delete failed");
        }
        return;
      }

      await deleteSectionFromIDB(sectionId);
      setSections((prev) => prev.filter((s) => s.id !== sectionId));

      if (token) {
        try {
          await deleteSectionApi(token, sectionId, effectiveWorkspaceId ?? undefined);
          if (sharedMode && workspaceId) {
            sendWs({ type: "SECTION_DELETE", workspaceId, sectionId });
          }
        } catch {}
      }
    },
    [token, workspaceId, effectiveWorkspaceId, sendWs, sharedMode]
  );

  const reorderSections = useCallback(
    async (reordered: Section[]) => {
      if (sharedMode && !requireOnline("Reorder Sections")) return;

      const withOrder = reordered.map((s, i) => ({
        ...s, order: i, updatedAt: Date.now(),
        dirty: !sharedMode,
      }));

      if (sharedMode) {
        if (!token || !workspaceId) return;
        try {
          await Promise.all(
            withOrder.map((s) => updateSectionApi(token, s.id, { order: s.order, workspaceId }))
          );
          await Promise.all(withOrder.map((s) => upsertSection(s)));
          setSections(withOrder);
        } catch {
          toast.error("Section reorder failed");
        }
        return;
      }

      setSections(withOrder);
      for (const s of withOrder) await upsertSection(s);

      if (token) {
        try {
          await Promise.all(
            withOrder.map((s) =>
              updateSectionApi(token, s.id, {
                order:       s.order,
                workspaceId: effectiveWorkspaceId ?? undefined,
              })
            )
          );
          for (const s of withOrder) await upsertSection({ ...s, dirty: false });
          if (sharedMode && workspaceId) {
            for (const s of withOrder) {
              sendWs({ type: "SECTION_UPDATE", workspaceId, section: s });
            }
          }
        } catch {}
      }
    },
    [effectiveWorkspaceId, token, workspaceId, sendWs, sharedMode]
  );

  return { createSection, renameSection, deleteSection, reorderSections };
}