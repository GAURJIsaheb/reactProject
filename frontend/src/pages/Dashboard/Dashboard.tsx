import { useRef, useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useTasksEngine } from "@/hooks/useTasksEngine";
import { fileToBase64 } from "@/utils/fileToBase64";
import { authHeaders } from "@/api/authApi";
import type { Task } from "@/types/task";
import { addTask, upsertQueue } from "@/lib/idb";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "@/components/toggleTheme/theme";
import {  ChevronLeft, ChevronRight } from "lucide-react";


import HeaderSection from "@/pages/Dashboard/HeaderSection";
import StatsBar from "@/pages/Dashboard/StatsBar";
import InputSection from "@/pages/Dashboard/InputSection";
import TaskSkeleton from "@/pages/Dashboard/TaskSkeleton";

import TaskCard from "@/components/tasks/TaskCard";
import ViewTaskDialog from "@/components/tasks/ViewTaskDialog";
import EditTaskDialog from "@/components/tasks/EditTaskDialog";


export default function Dashboard() {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;
  const [loading, setLoading] = useState(true);
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [workspace, setWorkspace] = useState("personal");

  const { logout, userEmail } = useAuthStore();
  const { tasks, createTask, toggleComplete, deleteTask, reloadTasks } = useTasksEngine();
  const { theme, toggleTheme } = useTheme();
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const totalPages = Math.ceil(activeTasks.length / PAGE_SIZE);
  const paginatedActive = activeTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [totalPages, page]);

  const handleAdd = async () => {
    if (!input.trim()) return;
    let base64: string | null = null;
    if (imageFile) base64 = await fileToBase64(imageFile);
    await createTask(input.trim(), base64);
    setInput("");
    setImageFile(null);
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
      await fetch(`http://localhost:4000/tasks/${id}`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ text, image }),
      });
    } catch { console.log("offline → queued"); }
    await reloadTasks();
  };

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
            <span className="text-[10px] tracking-[2px] uppercase text-gray-500 font-bold">
              Active Tasks
            </span>

          <div className="flex-1 h-px bg-linear-to-r from-white/10 to-transparent"/>

          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono
          bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
            {activeTasks.length}
          </span>
        </div>


          <div className="flex flex-col gap-2.5">
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TaskSkeleton key={i} />
              ))
            }

            {!loading && paginatedActive.length === 0 && (
              <div className="text-center py-12 text-gray-600 text-sm">
                <div className="text-4xl mb-3">✦</div>
                <p>No active tasks. Add one above!</p>
              </div>
            )}

            {!loading && paginatedActive.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onDelete={deleteTask}
                onToggle={toggleComplete}
                onEdit={(task) => setEditTask(task)}
                onView={(task) => setViewTask(task)}
                onShare={(task) => {
                  const email = prompt("Send task to email?");
                  if (!email) return;
                  fetch("http://localhost:4000/share", {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify({ toEmail: email, taskId: task.id }),
                  });
                }}
              />
            ))}
          </div>


          {/* PAGINATION */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">

            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-9.5 h-9.5 rounded-xl flex items-center justify-center
              bg-white/5 border border-white/15 text-gray-400
              hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-400/40
              disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={16}/>
            </button>

            <span className="px-4 py-1.5 rounded-full text-xs font-mono text-gray-400
            bg-white/5 border border-white/10">
              {page} / {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-9.5 h-9.5 rounded-xl flex items-center justify-center
              bg-white/5 border border-white/15 text-gray-400
              hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-400/40
              disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={16}/>
            </button>

            </div>

          )}

          {/* COMPLETED TASKS */}
          {completedTasks.length > 0 && (
            <>
              <div className="section-head" style={{ marginTop: 40 }}>
                <span className="section-label">Completed</span>
                <div className="section-line" />
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono
                  bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                        {completedTasks.length}
                </span>
              </div>
              <div className="tasks-list" style={{ opacity: 0.6 }}>
                {completedTasks.map((t) => (
                  <TaskCard
                    key={t.id} task={t}
                    onDelete={deleteTask} onToggle={toggleComplete}
                    onEdit={(task) => setEditTask(task)}
                    onView={(task) => setViewTask(task)}
                    onShare={() => {}}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* DIALOGS */}
      <ViewTaskDialog open={!!viewTask} onOpenChange={() => setViewTask(null)} task={viewTask} />
      <EditTaskDialog open={!!editTask} onOpenChange={() => setEditTask(null)} task={editTask} onSave={handleEditSave} />
    </>
  );
}