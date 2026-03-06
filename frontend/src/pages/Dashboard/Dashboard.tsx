import { useEffect, useCallback } from "react";
import { useAuthStore } from "@/zustand/authStore";
import { useTasksEngine } from "@/hooks/useTasksEngine";
import { useSectionsEngine } from "@/hooks/useSectionsEngine";
import { useTheme } from "@/shared/components/toggleTheme/theme";
import { toast } from "sonner";

import HeaderSection from "./components/header/HeaderSection";
import StatsBar from "./components/StatsBar";
import SearchBar from "./components/SearchBar";
import Archive from "@/archive/archive";
import KanbanBoard from "./kanban/KanbanBoard";
import EmptyBoardState from "./components/EmptyBoardState";
import KanbanSkeleton from "./components/KanbanSkeleton";

import ViewTaskDialog from "@/shared/components/tasks/editTaskDialog";

import { useDashboardState } from "./hooks/useDashboardState";
import { useDashboardDerived } from "./hooks/useDashboardDerived";
import { useTaskActions } from "./hooks/useTaskActions";
import { useWorkspaceSync } from "./hooks/useWorkspaceSync";
import { useDashboardNotifications } from "./hooks/useDashboardNotifications";

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
    workspaceOptions,
    addWorkspace,
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
    search, setSearch,
    sort,
    activeSectionId, setActiveSectionId,
    input, setInput,
    imageFile, setImageFile,
    reminderDate, setReminderDate,
    reminderTime, setReminderTime,
    workspaceId, setWorkspaceId,
    taskInputRef
  } = state;

  const {
    notifications,
    reloadCompletionNotifications,
    handleMarkAllRead,
    handleDismissNotification,
    setTaskReminder,
    getReminderLabel,
    getReminderDueAt,
  } = useDashboardNotifications({tasks,workspace,userEmail,token, });

  // ───────── DERIVED DATA ─────────
  const derived = useDashboardDerived(tasks, sections, search, sort, activeSectionId);
  const { activeTasks, completedTasks, hasNoSections, sortedTasks , activeSectionLabel} = derived;

  // ───────── SYNC ENGINE ─────────
  useWorkspaceSync(
    workspace,
    token,
    userEmail,
    setWorkspaceId,
    workspaceId,
    reloadTasks,
    loadSections,
    reloadCompletionNotifications
  );

  // ───────── TASK ACTIONS ─────────
  const actions = useTaskActions({
    input, setInput,
    imageFile, setImageFile,
    reminderDate, setReminderDate,
    reminderTime, setReminderTime,
    activeSectionId, setActiveSectionId,
    sections, hasNoSections,
    tasks, createTask, deleteTask, reloadTasks,
    workspace, userEmail, token, taskInputRef,
    onTaskReminderSet: setTaskReminder,
  });

  // ───────── BOOT LOADING ─────────
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setActiveSectionId(null);
  }, [workspace]);

  const handleTaskReminderUpdate = useCallback(
    (taskId: string, taskText: string, dueAt: number | null) => {
      setTaskReminder(taskId, taskText, dueAt);
    },
    [setTaskReminder]
  );

  const handleAddWorkspace = useCallback((name: string, emoji: string) => {
    addWorkspace(name, emoji);
  }, [addWorkspace]);

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
            workspaceOptions={workspaceOptions}
            onAddWorkspace={handleAddWorkspace}
            userName={userName}
            theme={theme}
            toggleTheme={toggleTheme}
            logout={logout}
            notifications={notifications}
            onMarkAllRead={handleMarkAllRead}
            onDismissNotification={handleDismissNotification}
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
              reminderDate={reminderDate}
              setReminderDate={setReminderDate}
              reminderTime={reminderTime}
              setReminderTime={setReminderTime}
              handleAdd={actions.handleAdd}
              sectionName={activeSectionLabel ?? undefined}
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
              onTaskView={(t) => setViewTask(t)}
              onTaskAdd={actions.handleTaskAddInSection}
              getReminderLabel={getReminderLabel}
            />
          )}

        </div>
      </div>

      <ViewTaskDialog
        open={!!viewTask}
        onOpenChange={() => setViewTask(null)}
        task={viewTask}
        reminderDueAt={viewTask ? getReminderDueAt(viewTask.id) : null}
        onSave={async (id, text, image, removeImage, reminderAt = null) => {
          if (reminderAt !== null && reminderAt <= Date.now()) {
            toast.error("Reminder time should be in future");
            return false;
          }
          const ok = await actions.handleEditSave(id, text, image, removeImage);
          if (!ok) return false;
          handleTaskReminderUpdate(id, text, reminderAt);
          setViewTask(null);
          toast.success("Task updated");
          return true;
        }}
      />
    </>
  );
}
