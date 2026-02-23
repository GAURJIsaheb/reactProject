import { useRef, useState, useEffect } from "react";
import { processQueue } from "@/queue/syncQueue";
import { useAuthStore } from "@/zustand/authStore";

import { useTasksEngine } from "@/hooks/useTasksEngine";
import { fileToBase64 } from "@/utils/fileToBase64";
import { authHeaders } from "@/api/authApi";
import type { Task } from "@/types/task";
import { addTask, upsertQueue } from "@/lib/idb";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "@/components/toggleTheme/theme";
import { ChevronLeft, ChevronRight } from "lucide-react";

import HeaderSection from "@/pages/Dashboard/HeaderSection";
import StatsBar from "@/pages/Dashboard/StatsBar";
import InputSection from "@/pages/Dashboard/InputSection";
import TaskSkeleton from "@/pages/Dashboard/TaskSkeleton";

import TaskCard from "@/components/tasks/TaskCard";
import ViewTaskDialog from "@/components/tasks/ViewTaskDialog";
import EditTaskDialog from "@/components/tasks/EditTaskDialog";

import SearchBar from "./SearchBar";
import SortToggle from "./SortToggle";
import type {SortType } from "./SortToggle";
import Archive from "@/archive/archive";

export default function Dashboard() {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;
  const [loading, setLoading] = useState(true);
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  // drag state
  const [dragId, setDragId] = useState<string | null>(null);
  const [taskOrder, setTaskOrder] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortType>("new");

  const { logout, userEmail ,token} = useAuthStore();
  const { tasks, workspace,setWorkspace, createTask, toggleComplete, deleteTask, reloadTasks  } = useTasksEngine();
  const { theme, toggleTheme } = useTheme();
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  

  const orderedTasks = taskOrder
    .map((id) => tasks.find((t) => t.id === id))
    .filter(Boolean) as Task[];

  //  SEARCH FILTER
  const filtered = orderedTasks.filter((t) =>
    t.text.toLowerCase().includes(search.toLowerCase())
  );

    //  SORT
    const sorted = [...filtered].sort((a, b) => {
      if (sort === "new") return b.createdAt - a.createdAt;
      if (sort === "old") return a.createdAt - b.createdAt;
      if (sort === "az") return a.text.localeCompare(b.text);
      return 0;
    });

  const activeTasks = sorted.filter((t) => !t.completed);
  const completedTasks = sorted.filter((t) => t.completed);
  const totalPages = Math.ceil(activeTasks.length / PAGE_SIZE);
  const paginatedActive = activeTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const handleAdd = async () => {
    if (!input.trim()) return;
    let base64: string | null = null;
    if (imageFile) base64 = await fileToBase64(imageFile);
    setInput("");
    setImageFile(null);
    await createTask(input.trim(), base64);
   
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleEditSave = async (id: string, text: string, image?: string | null) => {
    if (!userEmail) return;
    const updatedTask = {
      id, text, image: image ?? null, userEmail,
      workspaceType: "personal", updatedAt: Date.now(), dirty: true,
    };
    await addTask(updatedTask);
    await upsertQueue({
      id: uuidv4(), action: "update", taskId: id, userEmail,
      workspaceType: "personal", payload: updatedTask, retry: 0, nextRetry: Date.now(),
    });
    try {
      if ( !token) return;
      await fetch(`http://localhost:4000/tasks/${id}`, {
        method: "PUT", headers: authHeaders(token),
        body: JSON.stringify({ text, image }),
      });
    } catch { console.log("offline → queued"); }
    await reloadTasks();
  };

  // Drag-and-drop handlers
  const handleDragStart = (_e: React.DragEvent, id: string) => {
    setDragId(id);
  };

  const handleDragOver = (_e: React.DragEvent, overId: string) => {
    if (!dragId || dragId === overId) return;
    setTaskOrder((prev) => {
      const from = prev.indexOf(dragId);
      const to = prev.indexOf(overId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(to, 0, dragId);
      return next;
    });
  };

  const handleDrop = () => {
    setDragId(null);
  };

  // Global index for palette assignment (stable across active + completed)
  const globalIndex = (task: Task) => orderedTasks.indexOf(task);

    useEffect(() => {
      if (!token) return;

       const interval = setInterval(async () => {
          await processQueue(token);
          await reloadTasks(); // ← UI refresh 
        }, 10000); // try to scync at every 10 seconds

      return () => clearInterval(interval);
    }, [token]);

  // Keep taskOrder in sync with tasks array
  useEffect(() => {
    setTaskOrder((prev) => {
      const existingIds = new Set(prev);
      const newIds = tasks.map((t) => t.id).filter((id) => !existingIds.has(id));
      const filtered = prev.filter((id) => tasks.some((t) => t.id === id));
      return [...filtered, ...newIds];
    });
  }, [tasks]);



  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [totalPages, page]);

 

  

  return (
    <>
      <div className="dash-root">
        <div className="dash-inner">

          {/* HEADER */}
          <HeaderSection
            workspace={workspace}
            setWorkspace={setWorkspace}
            userEmail={userEmail}
            theme={theme}
            toggleTheme={toggleTheme}
            logout={logout}
          />

          {/* STATS */}
          <StatsBar
            active={activeTasks.length}
            done={completedTasks.length}
            total={tasks.length}
          />

          <Archive
            tasks={tasks}             // pass all tasks
            onTasksChanged={reloadTasks}  // reloadTasks from useTasksEngine
          />

          {/* SEARCH + SORT BAR */}
          <div className="w-full mb-5">
            <div className="
              flex flex-col sm:flex-row 
              items-stretch sm:items-center 
              gap-3
            ">
              {/* search */}
              <div className="flex-1 min-w-0">
                <SearchBar value={search} onChange={setSearch} />
              </div>

              {/* sort */}
              <div className="shrink-0">
                <SortToggle sort={sort} setSort={setSort} />
              </div>
            </div>
          </div>

          {/* INPUT */}
          <InputSection
            input={input}
            setInput={setInput}
            imageFile={imageFile}
            setImageFile={setImageFile}
            handleAdd={handleAdd}
          />

          {/* ACTIVE TASKS */}
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-[10px] ml-2.5 tracking-[2px] uppercase text-foreground font-bold">
              Active Tasks
            </span>
            <div className="flex-1 h-px bg-linear-to-r from-white/10 to-transparent" />
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              {activeTasks.length}
            </span>
          </div>

          {/* GRID LAYOUT — kanban style */}
          <div className="grid grid-cols-3 md:grid-cols-3 sm:grid-cols-2 gap-3">
            {loading &&
              Array.from({ length: 4 }).map((_, i) => <TaskSkeleton key={i} />)
            }

            {!loading && paginatedActive.length === 0 && (
              <div className="col-span-3 flex justify-center  py-12">
                <div className="text-center text-foreground text-sm">
                  <div className="text-4xl mb-3">.☘︎ ݁˖</div>
                  <p>No active tasks. Add one above!</p>
                </div>
              </div>
            )}

            {!loading && paginatedActive.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                index={globalIndex(t)}
                onDelete={deleteTask}
                onToggle={toggleComplete}
                onEdit={(task) => setEditTask(task)}
                onView={(task) => setViewTask(task)}
                draggable
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDragging={dragId === t.id}
              />
            ))}
          </div>



          {/* COMPLETED TASKS */}
          {completedTasks.length > 0 && (
            <>
              <div className="section-head" style={{ marginTop: 40 }}>
                <span className="section-label">Completed</span>
                <div className="section-line" />
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                  {completedTasks.length}
                </span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-3 sm:grid-cols-2 gap-3" style={{ opacity: 0.65 }}>
                {completedTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    index={globalIndex(t)}
                    onDelete={deleteTask}
                    onToggle={toggleComplete}
                    onEdit={(task) => setEditTask(task)}
                    onView={(task) => setViewTask(task)}
                    draggable
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    isDragging={dragId === t.id}
                  />
                ))}
              </div>
            </>
          )}

          {/* PAGINATION */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-9.5 h-9.5 rounded-xl flex items-center justify-center bg-card border border-border text-foreground hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-400/40 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-4 py-1.5 rounded-full text-xs font-mono text-foreground bg-card border border-border">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-9.5 h-9.5 rounded-xl flex items-center justify-center bg-card border border-border text-foreground hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-400/40 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* DIALOGS */}
      <ViewTaskDialog open={!!viewTask} onOpenChange={() => setViewTask(null)} task={viewTask} />
      <EditTaskDialog open={!!editTask} onOpenChange={() => setEditTask(null)} task={editTask} onSave={handleEditSave} />
    </>
  );
}