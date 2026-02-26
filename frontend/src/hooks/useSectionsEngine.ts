import { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAuthStore } from "@/zustand/authStore";
import type { Section } from "@/types/section";
import {
  getAllSections,
  upsertSection,
  deleteSectionFromIDB,
} from "@/lib/idb";
import {
  fetchSections,
  createSectionApi,
  updateSectionApi,
  deleteSectionApi,
} from "@/api/sectionApi";

export function useSectionsEngine(workspaceType: string) {
  const { token, userEmail } = useAuthStore();
  const [sections, setSections] = useState<Section[]>([]);

  // Load from IDB first, then sync from server
  const loadSections = useCallback(async () => {
    if (!userEmail) return;

    // Optimistic: load from IDB immediately
    const local = await getAllSections(userEmail, workspaceType);
    setSections(local);

    // Then sync from server
    if (!token) return;
    try {
      const remote = await fetchSections(token, workspaceType);
      for (const s of remote) {
        await upsertSection({ ...s, userEmail });
      }
      const merged = await getAllSections(userEmail, workspaceType);
      setSections(merged);
    } catch {
      // Offline — keep IDB data
    }
  }, [token, userEmail, workspaceType]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  const createSection = useCallback(
    async (title: string) => {
      if (!userEmail) return;

      const newSection: Section = {
        id: uuidv4(),
        title,
        workspaceType: workspaceType as Section["workspaceType"],
        userEmail,
        order: sections.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Optimistic update
      await upsertSection(newSection);
      setSections((prev) => [...prev, newSection]);

      // Sync to server
      if (token) {
        try {
          await createSectionApi(token, {
            id: newSection.id,
            title: newSection.title,
            workspaceType: newSection.workspaceType,
            order: newSection.order,
          });
        } catch {
          // Will remain in IDB for next sync
        }
      }
    },
    [token, userEmail, workspaceType, sections.length]
  );

  const renameSection = useCallback(
    async (sectionId: string, title: string) => {
      const updated = { updatedAt: Date.now(), title };

      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, ...updated } : s))
      );

      const existing = sections.find((s) => s.id === sectionId);
      if (existing) await upsertSection({ ...existing, ...updated });

      if (token) {
        try {
          await updateSectionApi(token, sectionId, { title });
        } catch {}
      }
    },
    [token, sections]
  );

  const deleteSection = useCallback(
    async (sectionId: string) => {
      await deleteSectionFromIDB(sectionId);
      setSections((prev) => prev.filter((s) => s.id !== sectionId));

      if (token) {
        try {
          await deleteSectionApi(token, sectionId);
        } catch {}
      }
    },
    [token]
  );

  const reorderSections = useCallback(
    async (reordered: Section[]) => {
      const withOrder = reordered.map((s, i) => ({ ...s, order: i }));
      setSections(withOrder);

      for (const s of withOrder) {
        await upsertSection(s);
      }

      if (token) {
        try {
          await Promise.all(
            withOrder.map((s) => updateSectionApi(token, s.id, { order: s.order }))
          );
        } catch {}
      }
    },
    [token]
  );

  return { sections, createSection, renameSection, deleteSection, reorderSections, loadSections };
}