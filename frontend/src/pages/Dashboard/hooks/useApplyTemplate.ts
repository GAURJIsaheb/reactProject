import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { WorkspaceTemplate } from "@/shared/data/workspaceTemplates";

interface UseApplyTemplateOptions {
  createSection:   (title: string) => Promise<any>;
  loadSections:    () => Promise<void>;
  reloadTasks:     () => Promise<void>;
  token:           string | null;
  workspace:       string;
  currentWsId:     string | null;
  workspaceId:     string | null;
  userEmail:       string | null;
  isSharedWorkspace: boolean;
}

export function useApplyTemplate({
  createSection,
  loadSections,
  reloadTasks,
  token,
  workspace,
  currentWsId,
  workspaceId,
  userEmail,
  isSharedWorkspace,
}: UseApplyTemplateOptions) {
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  const handleApplyTemplate = useCallback(async (template: WorkspaceTemplate) => {
    if (applyingTemplate) return;
    setApplyingTemplate(true);

    try {
      // 1) Create all sections sequentially so order is preserved
      for (const sec of template.sections) {
        await createSection(sec.title);
      }

      // 2) Reload sections so the engine + IDB are in sync
      await loadSections();

      // 3) Fetch fresh sections directly from the service layer
      const [{ fetchSections }, { apiBulkCreateTasks }, { fetchWorkspaceId, pullFromServer }] =
        await Promise.all([
          import("@/services/section.service"),
          import("@/services/task.service"),
          import("@/infrastructure/mongoSync/sync"),
        ]);

      const freshSections = await fetchSections(token!, workspace, currentWsId ?? undefined);

      // 4) Build bulk task list matched by section title
      const bulkTasks: Array<{
        id:            string;
        text:          string;
        workspaceType: string;
        workspaceId?:  string | null;
        sectionId:     string;
        labels:        string[];
        subtasks:      { text: string }[];
      }> = [];

      for (const tplSection of template.sections) {
        const matched = freshSections.find((s) => s.title === tplSection.title);
        if (!matched) continue;

        for (const task of tplSection.tasks) {
          bulkTasks.push({
            id:            crypto.randomUUID(),
            text:          task.text,
            workspaceType: workspace,
            workspaceId:   currentWsId ?? undefined,
            sectionId:     matched.id,
            labels:        task.labels   ?? [],
            subtasks:      task.subtasks ?? [],
          });
        }
      }

      if (bulkTasks.length > 0) {
        await apiBulkCreateTasks(bulkTasks, token!);

        const resolvedWorkspaceId =
          currentWsId ?? workspaceId ?? await fetchWorkspaceId(workspace, token!);

        if (resolvedWorkspaceId) {
          await pullFromServer(
            resolvedWorkspaceId,
            workspace,
            token!,
            userEmail ?? "",
            isSharedWorkspace
          );
        }
      }

      await loadSections();
      await reloadTasks();
      toast.success(`"${template.name}" template applied!`);
    } catch (err) {
      console.error("Template apply error:", err);
      toast.error("Couldn't fully apply this template");
    } finally {
      setApplyingTemplate(false);
    }
  }, [
    applyingTemplate,
    createSection, loadSections, reloadTasks,
    token, workspace, currentWsId, workspaceId,
    userEmail, isSharedWorkspace,
  ]);

  return { handleApplyTemplate, applyingTemplate };
}