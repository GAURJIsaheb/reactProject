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
  sharedMode:    boolean;
  sendWs:        SendWsFn;
};

// ── helpers ───────────────────────────────────────────────────────────────────
function requireOnline(action: string): boolean {
  if (!navigator.onLine) {
    toast.warning(`You're offline — "${action}" requires an internet connection in shared workspaces.`);
    return false;
  }
  return true;
}

// ── hook ─────────────────────────────────────────────────────────────────────
export function useSectionsEngine({ workspaceType, workspaceId, sharedMode, sendWs }: Props) {
  const { token, userEmail } = useAuthStore();
  const [sections, setSections] = useState<Section[]>([]);
  const effectiveWorkspaceId = sharedMode ? workspaceId : null;
  const pendingSectionCreatesRef = useRef<Set<string>>(new Set());

  // Keep a ref so the WS handler can read latest sections without going stale
  const sectionsRef = useRef<Section[]>(sections);
  sectionsRef.current = sections;

  const syncDirtySections = useCallback(
    async (localSections: Section[]) => {
      if (!token) return;

      for (const section of localSections) {
        if (!section.dirty) continue;

        try {
          await createSectionApi(token, {
            id: section.id,
            title: section.title,
            workspaceType: section.workspaceType,
            order: section.order,
            workspaceId: effectiveWorkspaceId ?? undefined,
          });
        } catch {
          try {
            await updateSectionApi(token, section.id, {
              title: section.title,
              order: section.order,
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

  // ── Load & server sync ─────────────────────────────────────────────────────
  const loadSections = useCallback(async () => {
    if (!userEmail) return;
    if (sharedMode) {
      if (!token || !workspaceId) {
        setSections([]);
        return;
      }

      try {
        const remote = await fetchSections(token, workspaceType, workspaceId);
        setSections(
          remote
            .map((section) => ({
              ...section,
              userEmail: section.userEmail || userEmail,
              workspaceType,
              workspaceId,
              dirty: false,
            }))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        );
      } catch {
        // Keep current in-memory state if refresh fails
      }
      return;
    }

    // Optimistic: IDB first
    const local = await getAllSections(userEmail, workspaceType, effectiveWorkspaceId);
    setSections(local);

    if (!token) return;
    try {
      await syncDirtySections(local);

      // Pass workspaceId so server can query the collab workspace correctly
      const remote = await fetchSections(token, workspaceType, effectiveWorkspaceId ?? undefined);

      for (const s of remote) {
        // Persist workspaceId on every section so the byWorkspaceId IDB index
        // stays populated for collab workspaces (receiver's persistence fix)
        await upsertSection({ ...s, userEmail, workspaceType, ...(effectiveWorkspaceId ? { workspaceId: effectiveWorkspaceId } : {}) });
      }

      const serverIds = remote.map((s: Section) => s.id);
      await pruneSyncedSectionsMissingOnServer(userEmail, workspaceType, serverIds, effectiveWorkspaceId);

      const merged = await getAllSections(userEmail, workspaceType, effectiveWorkspaceId);
      setSections(merged);
    } catch {
      // Offline — keep IDB data
    }
  }, [token, userEmail, workspaceType, effectiveWorkspaceId, sharedMode, workspaceId, syncDirtySections]);

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

        const toSave = {
          ...incoming,
          userEmail: userEmail!,
          workspaceType,
          ...(effectiveWorkspaceId ? { workspaceId: effectiveWorkspaceId } : {}),
        };
        if (!sharedMode) await upsertSection(toSave);
        setSections((prev) => {
          const filtered = prev.filter((s) => s.id !== incoming.id);
          return [...filtered, toSave].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
          );
        });
      }

      if (type === "SECTION_DELETE") {
        const sectionId = payload as string;
        if (!sharedMode) await deleteSectionFromIDB(sectionId);
        setSections((prev) => prev.filter((s) => s.id !== sectionId));
      }
    },
    [effectiveWorkspaceId, userEmail, workspaceType, sharedMode]
  );

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const createSection = useCallback(
    async (title: string) => {
      if (!userEmail) return;
      const trimmedTitle = title.trim();
      if (!trimmedTitle) return;
      const requestKey = `${sharedMode ? workspaceId ?? "shared" : workspaceType}:${trimmedTitle.toLowerCase()}`;
      if (pendingSectionCreatesRef.current.has(requestKey)) return;

      // Online-only for collab workspaces
      if (sharedMode && !requireOnline("Add Section")) return;

      if (sharedMode) {
        if (!token || !workspaceId) return;
        pendingSectionCreatesRef.current.add(requestKey);
        try {
          const created = await createSectionApi(token, {
            id: uuidv4(),
            title: trimmedTitle,
            workspaceType,
            order: sections.length,
            workspaceId,
          });
          const nextSection = {
            ...created,
            userEmail: created.userEmail || userEmail,
            workspaceType,
            workspaceId,
            dirty: false,
          };
          setSections((prev) =>
            [...prev.filter((section) => section.id !== nextSection.id), nextSection].sort(
              (a, b) => (a.order ?? 0) - (b.order ?? 0)
            )
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
            workspaceId:   effectiveWorkspaceId ?? undefined,
          });

          // Broadcast to collab peers
          if (sharedMode && workspaceId) {
            sendWs({
              type:        "SECTION_CREATE",
              workspaceId,
              section:     newSection,
            });
          }
          await upsertSection({ ...newSection, dirty: false });
        } catch {
          // Personal workspace — stays in IDB for next sync
          // Collab workspace — show error (optimistic UI stays, but peers won't see it)
          if (sharedMode) {
            toast.error("Section couldn't sync. Reload to check consistency.");
          }
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
          setSections((prev) => prev.map((s) => (s.id === sectionId ? updated : s)));
        } catch {
          toast.error("Section rename failed");
        }
        return;
      }

      const now     = Date.now();
      const updated = { updatedAt: now, title, dirty: true };

      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, ...updated } : s))
      );

      const existing = sectionsRef.current.find((s) => s.id === sectionId);
      if (existing) await upsertSection({ ...existing, ...updated });

      if (token) {
        try {
          await updateSectionApi(token, sectionId, { title });
          if (existing) await upsertSection({ ...existing, ...updated, dirty: false });

          if (sharedMode && workspaceId) {
            sendWs({
              type:        "SECTION_UPDATE",
              workspaceId,
              section:     { ...existing, ...updated },
            });
          }
        } catch {}
      }
    },
    [token, workspaceId, sendWs, sharedMode]
  );

  const deleteSection = useCallback(
    async (sectionId: string) => {
      if (sharedMode && !requireOnline("Delete Section")) return;
      if (sharedMode) {
        if (!token || !workspaceId) return;
        try {
          await deleteSectionApi(token, sectionId, workspaceId);
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
            sendWs({
              type:        "SECTION_DELETE",
              workspaceId,
              sectionId,
            });
          }
        } catch {}
      }
    },
    [token, workspaceId, effectiveWorkspaceId, sendWs, sharedMode]
  );

  const reorderSections = useCallback(
    async (reordered: Section[]) => {
      if (sharedMode && !requireOnline("Reorder Sections")) return;
      if (sharedMode) {
        if (!token || !workspaceId) return;
        const withOrder = reordered.map((s, i) => ({ ...s, order: i, updatedAt: Date.now(), dirty: false }));
        try {
          await Promise.all(
            withOrder.map((s) => updateSectionApi(token, s.id, { order: s.order, workspaceId }))
          );
          setSections(withOrder);
        } catch {
          toast.error("Section reorder failed");
        }
        return;
      }

      const withOrder = reordered.map((s, i) => ({ ...s, order: i, updatedAt: Date.now(), dirty: true }));
      setSections(withOrder);

      for (const s of withOrder) {
        await upsertSection(s);
      }

      if (token) {
        try {
          await Promise.all(
            withOrder.map((s) => updateSectionApi(token, s.id, { order: s.order }))
          );
          for (const s of withOrder) {
            await upsertSection({ ...s, dirty: false });
          }

          // Broadcast each reordered section to peers
          if (sharedMode && workspaceId) {
            for (const s of withOrder) {
              sendWs({ type: "SECTION_UPDATE", workspaceId, section: s });
            }
          }
        } catch {}
      }
    },
    [token, workspaceId, sendWs, sharedMode]
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
