import { useEffect } from "react";
import { useAuthStore } from "@/zustand/authStore";
import { useTasksEngine } from "@/hooks/useTasksEngine";
import { useSectionsEngine } from "@/hooks/useSectionsEngine";
import { useTheme } from "@/components/toggleTheme/theme";

import HeaderSection from "./components/HeaderSection";
import StatsBar from "./components/StatsBar";
import SearchBar from "./components/SearchBar";
import Archive from "@/archive/archive";
import KanbanBoard from "./kanban/KanbanBoard";
import EmptyBoardState from "./components/EmptyBoardState";
import KanbanSkeleton from "./components/KanbanSkeleton";

import ViewTaskDialog from "@/components/tasks/viewTaskDialog";
import EditTaskDialog from "@/components/tasks/editTaskDialog";

import { useDashboardState } from "./hooks/useDashboardState";
import { useDashboardDerived } from "./hooks/useDashboardDerived";
import { useTaskActions } from "./hooks/useTaskActions";
import { useWorkspaceSync } from "./hooks/useWorkspaceSync";

import InputSection from "./components/InputSection";

export default function Dashboard() {

  // ───────── AUTH ─────────
  const { logout, userEmail, userName, token } = useAuthStore();
  const { theme, toggleTheme } = useTheme();

  // ───────── ENGINES ─────────
  const {
    tasks,
    workspace,
    setWorkspace,
    createTask,
    toggleComplete,
    deleteTask,
    reloadTasks,
  } = useTasksEngine();

  const {
    sections,
    createSection,
    renameSection,
    deleteSection,
    reorderSections,
    loadSections,
  } = useSectionsEngine(workspace);

  // ───────── LOCAL DASHBOARD STATE ─────────
  const state = useDashboardState();
  const {
    loading, setLoading,
    viewTask, setViewTask,
    editTask, setEditTask,
    search, setSearch,
    sort,
    activeSectionId, setActiveSectionId,
    input, setInput,
    imageFile, setImageFile,
    workspaceId, setWorkspaceId,
    taskInputRef
  } = state;

  // ───────── DERIVED DATA ─────────
  const derived = useDashboardDerived(tasks, sections, search, sort, activeSectionId);
  const { activeTasks, completedTasks, hasNoSections, sortedTasks } = derived;

  // ───────── SYNC ENGINE ─────────
  useWorkspaceSync(
    workspace,
    token,
    userEmail,
    setWorkspaceId,
    workspaceId,
    reloadTasks,
    loadSections
  );

  // ───────── TASK ACTIONS ─────────
  const actions = useTaskActions({
    input, setInput,
    imageFile, setImageFile,
    activeSectionId, setActiveSectionId,
    sections, hasNoSections,
    tasks, createTask, deleteTask, reloadTasks,
    workspace, userEmail, token, taskInputRef
  });

  // ───────── BOOT LOADING ─────────
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setActiveSectionId(null);
  }, [workspace]);

  // ───────── RENDER ─────────
  return (
    <>
      {/* Ambient background orbs */}
      <div className="dash-orbs" aria-hidden="true">
        <div className="dash-orb dash-orb-1" />
        <div className="dash-orb dash-orb-2" />
        <div className="dash-orb dash-orb-3" />
      </div>

      <div className="dash-root">
        <div className="dash-inner">

          <HeaderSection
            workspace={workspace}
            setWorkspace={setWorkspace}
            userName={userName}
            theme={theme}
            toggleTheme={toggleTheme}
            logout={logout}
          />

          <StatsBar
            active={activeTasks.length}
            done={completedTasks.length}
            total={tasks.length}
          />

          <Archive tasks={tasks} onTasksChanged={reloadTasks} />

          {/* Search + Sort row */}
          <div className="w-[98%] ml-2 mb-5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <SearchBar value={search} onChange={setSearch} />
              </div>
            </div>
          </div>

          {/* Task input bar */}
          {activeSectionId && !hasNoSections && (
            <InputSection
              ref={taskInputRef}
              input={input}
              setInput={setInput}
              imageFile={imageFile}
              setImageFile={setImageFile}
              handleAdd={actions.handleAdd}
            />
          )}

          {/* Board */}
          {loading ? (
            <KanbanSkeleton count={3} />
          ) : hasNoSections ? (
            <EmptyBoardState onCreateFirst={() => createSection("My Tasks")} />
          ) : (
            <KanbanBoard
              sections={sections}
              tasks={sortedTasks}
              onSectionsReorder={reorderSections}
              onCreateSection={createSection}
              onRenameSection={renameSection}
              onDeleteSection={deleteSection}
              onTasksChanged={reloadTasks}
              onTaskDelete={actions.handleDelete}
              onTaskToggle={toggleComplete}
              onTaskEdit={(t) => setEditTask(t)}
              onTaskView={(t) => setViewTask(t)}
              onTaskAdd={actions.handleTaskAddInSection}
            />
          )}

        </div>
      </div>

      <ViewTaskDialog
        open={!!viewTask}
        onOpenChange={() => setViewTask(null)}
        task={viewTask}
      />

      <EditTaskDialog
        open={!!editTask}
        onOpenChange={() => setEditTask(null)}
        task={editTask}
        onSave={actions.handleEditSave}
      />
    </>
  );
}