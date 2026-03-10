import { useState, useCallback, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useAuthStore } from "@/zustand/authStore";
import type { Section } from "@/shared/types/section";
import {
  getAllSections,
  upsertSection,
  deleteSectionFromIDB,
  pruneSyncedSectionsMissingOnServer,
} from "@/infrastructure/lib/idb";
import {
  fetchSections,
  createSectionApi,
  updateSectionApi,
  deleteSectionApi,
} from "@/services/section.service";

type SendWsFn = (msg: object) => void;

type Props = {
  workspaceType: string;
  /** Server-side workspaceId — present only for collab (shared) workspaces */
  workspaceId:   string | null;
  sendWs:        SendWsFn;
};

// ── helpers ───────────────────────────────────────────────────────────────────
function isCollab(workspaceId: string | null): workspaceId is string {
  return workspaceId !== null;
}

function requireOnline(action: string): boolean {
  if (!navigator.onLine) {
    toast.warning(`You're offline — "${action}" requires an internet connection in shared workspaces.`);
    return false;
  }
  return true;
}

// ── hook ─────────────────────────────────────────────────────────────────────
export function useSectionsEngine({ workspaceType, workspaceId, sendWs }: Props) {
  const { token, userEmail } = useAuthStore();
  const [sections, setSections] = useState<Section[]>([]);

  // Keep a ref so the WS handler can read latest sections without going stale
  const sectionsRef = useRef<Section[]>(sections);
  sectionsRef.current = sections;

  // ── Load & server sync ─────────────────────────────────────────────────────
  const loadSections = useCallback(async () => {
    if (!userEmail) return;

    // Optimistic: IDB first
    const local = await getAllSections(userEmail, workspaceType, workspaceId);
    setSections(local);

    if (!token) return;
    try {
      // Pass workspaceId so server can query the collab workspace correctly
      const remote = await fetchSections(token, workspaceType, workspaceId ?? undefined);

      for (const s of remote) {
        // Persist workspaceId on every section so the byWorkspaceId IDB index
        // stays populated for collab workspaces (receiver's persistence fix)
        await upsertSection({ ...s, userEmail, workspaceType, ...(workspaceId ? { workspaceId } : {}) });
      }

      const serverIds = remote.map((s: Section) => s.id);
      await pruneSyncedSectionsMissingOnServer(userEmail, workspaceType, serverIds, workspaceId);

      const merged = await getAllSections(userEmail, workspaceType, workspaceId);
      setSections(merged);
    } catch {
      // Offline — keep IDB data
    }
  }, [token, userEmail, workspaceType, workspaceId]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  // ── Incoming WS handler ────────────────────────────────────────────────────
  // Called by useTasksEngine when a SECTION_* WS message arrives
  const handleWsSection = useCallback(
    async (type: string, payload: unknown) => {
      if (type === "SECTION_CREATE" || type === "SECTION_UPDATE") {
        const incoming = payload as Section;

        // OCC: only apply if incoming is newer
        const existing = sectionsRef.current.find((s) => s.id === incoming.id);
        if (existing && existing.updatedAt >= incoming.updatedAt) return;

        const toSave = { ...incoming, userEmail: userEmail!, workspaceType, ...(workspaceId ? { workspaceId } : {}) };
        await upsertSection(toSave);
        setSections((prev) => {
          const filtered = prev.filter((s) => s.id !== incoming.id);
          return [...filtered, toSave].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
          );
        });
      }

      if (type === "SECTION_DELETE") {
        const sectionId = payload as string;
        await deleteSectionFromIDB(sectionId);
        setSections((prev) => prev.filter((s) => s.id !== sectionId));
      }
    },
    [userEmail, workspaceType, workspaceId]
  );

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const createSection = useCallback(
    async (title: string) => {
      if (!userEmail) return;
      // Online-only for collab workspaces
      if (isCollab(workspaceId) && !requireOnline("Add Section")) return;

      const newSection: Section = {
        id:            uuidv4(),
        title,
        workspaceType: workspaceType as Section["workspaceType"],
        userEmail,
        order:         sections.length,
        createdAt:     Date.now(),
        updatedAt:     Date.now(),
      };

      // Optimistic update
      await upsertSection(newSection);
      setSections((prev) => [...prev, newSection]);

      if (token) {
        try {
          await createSectionApi(token, {
            id:            newSection.id,
            title:         newSection.title,
            workspaceType: newSection.workspaceType,
            order:         newSection.order,
            workspaceId:   workspaceId ?? undefined,
          });

          // Broadcast to collab peers
          if (isCollab(workspaceId)) {
            sendWs({
              type:        "SECTION_CREATE",
              workspaceId,
              section:     newSection,
            });
          }
        } catch {
          // Personal workspace — stays in IDB for next sync
          // Collab workspace — show error (optimistic UI stays, but peers won't see it)
          if (isCollab(workspaceId)) {
            toast.error("Section couldn't sync. Reload to check consistency.");
          }
        }
      }
    },
    [token, userEmail, workspaceType, workspaceId, sections.length, sendWs]
  );

  const renameSection = useCallback(
    async (sectionId: string, title: string) => {
      if (isCollab(workspaceId) && !requireOnline("Rename Section")) return;

      const now     = Date.now();
      const updated = { updatedAt: now, title };

      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, ...updated } : s))
      );

      const existing = sectionsRef.current.find((s) => s.id === sectionId);
      if (existing) await upsertSection({ ...existing, ...updated });

      if (token) {
        try {
          await updateSectionApi(token, sectionId, { title });

          if (isCollab(workspaceId)) {
            sendWs({
              type:        "SECTION_UPDATE",
              workspaceId,
              section:     { ...existing, ...updated },
            });
          }
        } catch {}
      }
    },
    [token, workspaceId, sendWs]
  );

  const deleteSection = useCallback(
    async (sectionId: string) => {
      if (isCollab(workspaceId) && !requireOnline("Delete Section")) return;

      await deleteSectionFromIDB(sectionId);
      setSections((prev) => prev.filter((s) => s.id !== sectionId));

      if (token) {
        try {
          await deleteSectionApi(token, sectionId);

          if (isCollab(workspaceId)) {
            sendWs({
              type:        "SECTION_DELETE",
              workspaceId,
              sectionId,
            });
          }
        } catch {}
      }
    },
    [token, workspaceId, sendWs]
  );

  const reorderSections = useCallback(
    async (reordered: Section[]) => {
      if (isCollab(workspaceId) && !requireOnline("Reorder Sections")) return;

      const withOrder = reordered.map((s, i) => ({ ...s, order: i, updatedAt: Date.now() }));
      setSections(withOrder);

      for (const s of withOrder) {
        await upsertSection(s);
      }

      if (token) {
        try {
          await Promise.all(
            withOrder.map((s) => updateSectionApi(token, s.id, { order: s.order }))
          );

          // Broadcast each reordered section to peers
          if (isCollab(workspaceId)) {
            for (const s of withOrder) {
              sendWs({ type: "SECTION_UPDATE", workspaceId, section: s });
            }
          }
        } catch {}
      }
    },
    [token, workspaceId, sendWs]
  );

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