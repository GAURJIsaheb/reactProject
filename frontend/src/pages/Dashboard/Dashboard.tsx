import { useEffect, useCallback } from "react";
import { useAuthStore }           from "@/zustand/authStore";
import { useTasksEngine }         from "@/features/tasks/hooks/useTasksEngine";
import { useSectionsEngine }      from "@/features/sections/hooks/useSectionsEngine";
import { useTheme }               from "@/shared/components/toggleTheme/theme";

import Sidebar          from "./components/sidebar/Sidebar";
import StatsBar         from "./components/StatsBar";
import SearchBar        from "./components/SearchBar";
import Archive          from "@/features/archive/archive";
import KanbanBoard      from "./kanban/KanbanBoard";
import EmptyBoardState  from "./components/EmptyBoardState";
import KanbanSkeleton   from "./components/KanbanSkeleton";
import ViewTaskDialog   from "@/features/tasks/ui/ViewTaskDialog";
import InputSection     from "./components/InputSection";

import { useDashboardState }         from "./hooks/useDashboardState";
import { useDashboardDerived }       from "./hooks/useDashboardDerived";
import { useTaskActions }            from "./hooks/useTaskActions";
import { useWorkspaceSync }          from "./hooks/useWorkspaceSync";
import { useDashboardNotifications } from "./hooks/useDashboardNotifications";
import { useApplyTemplate }          from "./hooks/useApplyTemplate";
import { toast } from "sonner";

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
    deleteWorkspace,
    isDeletingWorkspace,
    createTask,
    toggleComplete,
    deleteTask,
    reloadTasks,
    isSharedWorkspace,
    refreshWorkspaceOptions,
    currentWsId,
    sendWs,
    registerSectionWsHandler,
  } = useTasksEngine();

  const {
    sections,
    createSection,
    renameSection,
    deleteSection,
    reorderSections,
    loadSections,
    handleWsSection,
  } = useSectionsEngine({
    workspaceType: workspace,
    workspaceId:   currentWsId,
    sharedMode:    isSharedWorkspace,
    sendWs,
  });

  useEffect(() => {
    registerSectionWsHandler(handleWsSection);
  }, [registerSectionWsHandler, handleWsSection]);

  // ───────── LOCAL STATE ─────────
  const state = useDashboardState();
  const {
    loading, setLoading,
    viewTask, setViewTask,
    search, setSearch,
    sort,
    activeSectionId, setActiveSectionId,
    input, setInput,
    imageFile, setImageFile,
    labelsInput, setLabelsInput,
    reminderDate, setReminderDate,
    reminderTime, setReminderTime,
    workspaceId, setWorkspaceId,
    taskInputRef,
  } = state;

  // ───────── NOTIFICATIONS ─────────
  const {
    notifications,
    reloadCompletionNotifications,
    handleMarkAllRead,
    handleDismissNotification,
    getReminderLabel,
    getReminderDueAt,
  } = useDashboardNotifications({ tasks, workspace, userEmail, token });

  // ───────── DERIVED DATA ─────────
  const { activeTasks, completedTasks, hasNoSections, sortedTasks, activeSectionLabel } =
    useDashboardDerived(tasks, sections, search, sort, activeSectionId);

  // ───────── SYNC ─────────
  useWorkspaceSync(
    workspace, setWorkspace,
    token, userEmail,
    isSharedWorkspace, currentWsId,
    setWorkspaceId, workspaceId,
    reloadTasks, loadSections,
    reloadCompletionNotifications,
    refreshWorkspaceOptions
  );

  // ───────── TASK ACTIONS ─────────
  const actions = useTaskActions({
    input, setInput,
    imageFile, setImageFile,
    labelsInput, setLabelsInput,
    reminderDate, setReminderDate,
    reminderTime, setReminderTime,
    activeSectionId, setActiveSectionId,
    sections, hasNoSections,
    tasks, createTask, deleteTask, reloadTasks,
    workspace, userEmail, token, taskInputRef,
  });

  // ───────── TEMPLATE ─────────
  const { handleApplyTemplate } = useApplyTemplate({
    createSection, loadSections, reloadTasks,
    token, workspace, currentWsId, workspaceId,
    userEmail, isSharedWorkspace,
  });

  // ───────── BOOT ─────────
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setActiveSectionId(null);
  }, [workspace]);

  const handleAddWorkspace    = useCallback((name: string, emoji: string) => addWorkspace(name, emoji), [addWorkspace]);
  const handleDeleteWorkspace = useCallback(() => deleteWorkspace(), [deleteWorkspace]);

  // ───────── RENDER ─────────
  return (
    <>
      <Sidebar
        workspace={workspace}
        setWorkspace={setWorkspace}
        workspaceOptions={workspaceOptions}
        onAddWorkspace={handleAddWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
        isDeletingWorkspace={isDeletingWorkspace}
        userName={userName}
        theme={theme}
        toggleTheme={toggleTheme}
        logout={logout}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        onDismissNotification={handleDismissNotification}
      />

      <div className="dash-layout mt-4 ml-2">
        <div className="dash-orbs" aria-hidden="true">
          <div className="dash-orb dash-orb-1" />
          <div className="dash-orb dash-orb-2" />
          <div className="dash-orb dash-orb-3" />
        </div>

        <div className="dash-root">
          <div className="dash-inner">

            <StatsBar
              active={activeTasks.length}
              done={completedTasks.length}
              total={tasks.length}
            />

            <Archive
              tasks={tasks}
              onTasksChanged={reloadTasks}
              workspace={workspace}
              workspaceId={currentWsId}
            />

            <div className="w-[98%] ml-2 mb-5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <SearchBar value={search} onChange={setSearch} />
                </div>
              </div>
            </div>

            {activeSectionId && !hasNoSections && (
              <InputSection
                ref={taskInputRef}
                input={input}
                setInput={setInput}
                imageFile={imageFile}
                setImageFile={setImageFile}
                labelsInput={labelsInput}
                setLabelsInput={setLabelsInput}
                reminderDate={reminderDate}
                setReminderDate={setReminderDate}
                reminderTime={reminderTime}
                setReminderTime={setReminderTime}
                handleAdd={actions.handleAdd}
                handleCreateFromSpeech={actions.handleAddFromSpeech}
                sectionName={activeSectionLabel ?? undefined}
              />
            )}

            {loading ? (
              <KanbanSkeleton count={3} />
            ) : hasNoSections ? (
              <EmptyBoardState
                onCreateFirst={() => createSection("My Tasks")}
                onApplyTemplate={handleApplyTemplate}
              />
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
      </div>

      <ViewTaskDialog
        open={!!viewTask}
        onOpenChange={() => setViewTask(null)}
        task={viewTask}
        reminderDueAt={viewTask ? getReminderDueAt(viewTask.id) : null}
        onSave={async (id, text, labels, subtasks, image, removeImage, reminderAt = null) => {
          if (reminderAt !== null && reminderAt <= Date.now()) {
            toast.error("Reminder time should be in future");
            return false;
          }
          const ok = await actions.handleEditSave(id, text, labels, subtasks, image, removeImage, reminderAt);
          if (!ok) return false;
          setViewTask(null);
          toast.success("Task updated");
          return true;
        }}
      />
    </>
  );
}