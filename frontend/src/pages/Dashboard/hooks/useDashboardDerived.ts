import { useMemo } from "react";
import type { Task } from "@/shared/types/task";
import type { Section } from "@/shared/types/section";

export function useDashboardDerived(
  tasks: Task[],
  sections: Section[],
  search: string,
  sort: string,
  activeSectionId: string | null
) {
  const activeTasks = useMemo(
    () => tasks.filter(t => !t.completed && !t.deleted && !t.archived),
    [tasks]
  );

  const completedTasks = useMemo(
    () => tasks.filter(t => t.completed && !t.deleted && !t.archived),
    [tasks]
  );

  const hasNoSections = sections.length === 0;

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks.filter((t) => {
      if (t.archived || t.deleted) return false;
      if (!query) return true;

      const inText = t.text.toLowerCase().includes(query);
      const inLabels = (t.labels ?? []).some((label) => label.toLowerCase().includes(query));
      return inText || inLabels;
    });
  }, [tasks, search]);

  const sortedTasks = useMemo(() => {
    if (sort === "new") return filteredTasks;

    return [...filteredTasks].sort((a, b) => {
      if (sort === "old") return a.createdAt - b.createdAt;
      if (sort === "az") return a.text.localeCompare(b.text);
      return 0;
    });
  }, [filteredTasks, sort]);

  const activeSectionLabel = activeSectionId
    ? sections.find(s => s.id === activeSectionId)?.title ?? null
    : null;

  return {
    activeTasks,
    completedTasks,
    hasNoSections,
    sortedTasks,
    activeSectionLabel
  };
}
