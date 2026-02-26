import { useRef, useState, useEffect, useCallback } from "react";
import { processQueue } from "@/queue/syncQueue";
import { useAuthStore } from "@/zustand/authStore";
import { useTasksEngine } from "@/hooks/useTasksEngine";
import { useSectionsEngine } from "@/hooks/useSectionsEngine";
import { fileToBase64 } from "@/utils/fileToBase64";
import { authHeaders } from "@/api/authApi";
import type { Task } from "@/types/task";
import { addTask, upsertQueue } from "@/lib/idb";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "@/components/toggleTheme/theme";

import HeaderSection from "@/pages/Dashboard/HeaderSection";
import StatsBar from "@/pages/Dashboard/StatsBar";
import KanbanBoard from "@/pages/Dashboard/kanban/KanbanBoard";
import SearchBar from "./SearchBar";
import SortToggle from "./SortToggle";
import type { SortType } from "./SortToggle";
import Archive from "@/archive/archive";
import ViewTaskDialog from "@/components/tasks/ViewTaskDialog";
import EditTaskDialog from "@/components/tasks/EditTaskDialog";
import { toast } from "sonner";
import { X, LayoutGrid, AlertCircle } from "lucide-react";

// ─── Kanban loading skeleton ──────────────────────────────────────────────────

function KanbanSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-4 mt-2 overflow-x-auto pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-72 shrink-0 rounded-2xl bg-card/40 border border-border/30 animate-pulse"
          style={{ height: "320px", animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

// ─── Empty state — no sections created yet ────────────────────────────────────

function EmptyBoardState({ onCreateFirst }: { onCreateFirst: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center
        bg-indigo-500/10 border border-indigo-400/20 text-indigo-400">
        <LayoutGrid size={28} />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-foreground mb-1">No sections yet</p>
        <p className="text-sm text-muted-foreground">
          Create a section to start organising your tasks
        </p>
      </div>
      <button
        onClick={onCreateFirst}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white
          bg-linear-to-br from-indigo-500 to-violet-500
          shadow-[0_0_20px_rgba(99,102,241,0.4)]
          hover:scale-105 hover:shadow-[0_0_28px_rgba(99,102,241,0.6)]
          active:scale-95 transition-all duration-150"
      >
        + Create first section
      </button>
    </div>
  );
}

// ─── Inline task input — floats above the board ───────────────────────────────

interface TaskInputBarProps {
  input: string;
  setInput: (v: string) => void;
  imageFile: File | null;
  setImageFile: (f: File | null) => void;
  activeSectionLabel: string | null;
  onClearSection: () => void;
  onAdd: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  hasNoSections: boolean;
}

function TaskInputBar({
  input,
  setInput,
  imageFile,
  setImageFile,
  activeSectionLabel,
  onClearSection,
  onAdd,
  inputRef,
  hasNoSections,
}: TaskInputBarProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const showSectionWarning = input.trim().length > 0 && !activeSectionLabel && !hasNoSections;

  return (
    <div className="mb-6 space-y-2">
      {/* Section target badge */}
      {activeSectionLabel && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg
          bg-indigo-500/10 border border-indigo-400/25 w-fit">
          <span className="text-[11px] text-indigo-300">
            Adding to{" "}
            <span className="font-semibold text-indigo-200">
              &ldquo;{activeSectionLabel}&rdquo;
            </span>
          </span>
          <button
            onClick={onClearSection}
            className="text-indigo-400 hover:text-indigo-200 transition"
            aria-label="Clear section target"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* Warning — typed something but no section targeted */}
      {showSectionWarning && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg
          bg-amber-500/10 border border-amber-400/25 w-fit animate-in fade-in duration-200">
          <AlertCircle size={11} className="text-amber-400 shrink-0" />
          <span className="text-[11px] text-amber-300">
            Click <span className="font-semibold">+ Add task</span> inside a column first,
            or the task will go to the first section
          </span>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl
        bg-white/5 border border-border backdrop-blur-xl
        focus-within:border-indigo-400/50 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]
        transition-all duration-200">

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setImageFile(f);
          }}
        />

        {/* Image preview pill */}
        {imageFile ? (
          <button
            onClick={() => { setImageFile(null); if (fileRef.current) fileRef.current.value = ""; }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono
              bg-indigo-500/20 border border-indigo-400/40 text-indigo-300
              hover:bg-rose-500/20 hover:border-rose-400/40 hover:text-rose-300 transition shrink-0"
          >
            📎 {imageFile.name.length > 12 ? imageFile.name.slice(0, 12) + "…" : imageFile.name}
            <X size={10} />
          </button>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0
              bg-card border border-border text-muted-foreground
              hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-400/40 transition"
            title="Attach image"
          >
            <span className="text-base">📎</span>
          </button>
        )}

        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            hasNoSections
              ? "Create a section first to add tasks…"
              : activeSectionLabel
                ? `Add task to "${activeSectionLabel}"…`
                : "Click + Add task in a column, then type here…"
          }
          disabled={hasNoSections}
          onKeyDown={(e) => e.key === "Enter" && !hasNoSections && onAdd()}
          className="flex-1 bg-transparent outline-none text-[15px] text-foreground
            placeholder:text-muted-foreground/50 disabled:cursor-not-allowed
            disabled:opacity-40"
        />

        <button
          onClick={onAdd}
          disabled={hasNoSections || !input.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white
            bg-linear-to-br from-indigo-500 to-violet-500
            shadow-[0_0_20px_rgba(99,102,241,0.4)]
            hover:scale-105 hover:shadow-[0_0_30px_rgba(99,102,241,0.6)]
            active:scale-95 transition-all duration-150
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
            disabled:shadow-none"
        >
          + Add
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortType>("new");

  // Which section the next task will land in
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const taskInputRef = useRef<HTMLInputElement>(null);

  const { logout, userEmail, userName, token } = useAuthStore();
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
  } = useSectionsEngine(workspace);

  const { theme, toggleTheme } = useTheme();

  // ─── Derived ────────────────────────────────────────────────────────────────

  const activeTasks  = tasks.filter((t) => !t.completed && !t.deleted);
  const completedTasks = tasks.filter((t) => t.completed  && !t.deleted);
  const hasNoSections = sections.length === 0;

  const filteredTasks = tasks.filter((t) =>
    t.text.toLowerCase().includes(search.toLowerCase())
  );

  const sortedTasks =
    sort === "new"
      ? filteredTasks
      : [...filteredTasks].sort((a, b) => {
          if (sort === "old") return a.createdAt - b.createdAt;
          if (sort === "az")  return a.text.localeCompare(b.text);
          return 0;
        });

  const activeSectionLabel = activeSectionId
    ? (sections.find((s) => s.id === activeSectionId)?.title ?? null)
    : null;

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleAdd = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || hasNoSections) return;

    // If no section is targeted, fall back to the first section silently
    const targetSectionId = activeSectionId ?? sections[0]?.id ?? null;
    if (!targetSectionId) return;

    let base64: string | null = null;
    if (imageFile) base64 = await fileToBase64(imageFile);

    setInput("");
    setImageFile(null);

    await createTask(trimmed, base64, targetSectionId);

    toast.success("✨ Task added!", {
      description: `"${trimmed}"`,
      duration: 2500,
    });
  }, [input, imageFile, activeSectionId, sections, hasNoSections, createTask]);

  const handleDelete = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id);
      deleteTask(id);
      toast.success("🧹 Task deleted", {
        description: task ? `"${task.text}"` : "Task removed",
        duration: 2500,
      });
    },
    [tasks, deleteTask]
  );

  const handleEditSave = useCallback(
    async (id: string, text: string, image?: string | null) => {
      if (!userEmail) return;

      const updatedTask = {
        id,
        text,
        image: image ?? null,
        userEmail,
        workspaceType: workspace,
        updatedAt: Date.now(),
        dirty: true,
      };

      await addTask(updatedTask);
      await upsertQueue({
        id: uuidv4(),
        action: "update",
        taskId: id,
        userEmail,
        workspaceType: workspace,
        payload: updatedTask,
        retry: 0,
        nextRetry: Date.now(),
      });

      try {
        if (!token) return;
        await fetch(`http://localhost:4000/tasks/${id}`, {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({ text, image }),
        });
      } catch {
        // Offline — sync queue handles retry
      }

      await reloadTasks();
    },
    [userEmail, workspace, token, reloadTasks]
  );

  // Called by KanbanColumn "Add task" button
  const handleTaskAddInSection = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId);
    requestAnimationFrame(() => {
      taskInputRef.current?.focus();
    });
  }, []);

  const handleClearSection = useCallback(() => setActiveSectionId(null), []);

  // Called by EmptyBoardState CTA — creates first section and auto-focuses its name
  const handleCreateFirstSection = useCallback(() => {
    createSection("My Tasks");
  }, [createSection]);

  // ─── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(async () => {
      await processQueue(token);
      await reloadTasks();
    }, 10_000);
    return () => clearInterval(interval);
  }, [token, reloadTasks]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);

  // Reset section target on workspace switch
  useEffect(() => {
    setActiveSectionId(null);
  }, [workspace]);

  // Auto-select first section when sections load and none is targeted
  useEffect(() => {
    if (!activeSectionId && sections.length > 0) {
      // Do NOT auto-select — keep UX intentional
      // User must click "+ Add task" in a column to target it
    }
  }, [sections, activeSectionId]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="dash-root">
        <div className="dash-inner">

          {/* ── Header ── */}
          <HeaderSection
            workspace={workspace}
            setWorkspace={setWorkspace}
            userName={userName}
            theme={theme}
            toggleTheme={toggleTheme}
            logout={logout}
          />

          {/* ── Stats ── */}
          <StatsBar
            active={activeTasks.length}
            done={completedTasks.length}
            total={tasks.length}
          />

          {/* ── Archive ── */}
          <Archive tasks={tasks} onTasksChanged={reloadTasks} />

          {/* ── Search + Sort ── */}
          <div className="w-full mb-5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <SearchBar value={search} onChange={setSearch} />
              </div>
              <div className="shrink-0">
                <SortToggle sort={sort} setSort={setSort} />
              </div>
            </div>
          </div>

          {/* ── Task input bar (only when section selected) ── */}
          {activeSectionId && !hasNoSections && (
            <TaskInputBar
              input={input}
              setInput={setInput}
              imageFile={imageFile}
              setImageFile={setImageFile}
              activeSectionLabel={activeSectionLabel}
              onClearSection={handleClearSection}
              onAdd={handleAdd}
              inputRef={taskInputRef}
              hasNoSections={hasNoSections}
            />
          )}

          {/* ── Board ── */}
          {loading ? (
            <KanbanSkeleton count={3} />
          ) : hasNoSections ? (
            <EmptyBoardState onCreateFirst={handleCreateFirstSection} />
          ) : (
            <KanbanBoard
              sections={sections}
              tasks={sortedTasks}
              onSectionsReorder={reorderSections}
              onCreateSection={createSection}
              onRenameSection={renameSection}
              onDeleteSection={deleteSection}
              onTasksChanged={reloadTasks}
              onTaskDelete={handleDelete}
              onTaskToggle={toggleComplete}
              onTaskEdit={(task) => setEditTask(task)}
              onTaskView={(task) => setViewTask(task)}
              onTaskAdd={handleTaskAddInSection}
            />
          )}
        </div>
      </div>

      {/* ── Dialogs ── */}
      <ViewTaskDialog
        open={!!viewTask}
        onOpenChange={() => setViewTask(null)}
        task={viewTask}
      />
      <EditTaskDialog
        open={!!editTask}
        onOpenChange={() => setEditTask(null)}
        task={editTask}
        onSave={handleEditSave}
      />
    </>
  );
}