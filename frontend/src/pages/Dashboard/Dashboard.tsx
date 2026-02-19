import { useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useTasksEngine } from "@/hooks/useTasksEngine";
import { fileToBase64 } from "@/utils/fileToBase64";
import { authHeaders } from "@/api/authApi";
import type{ Task } from "@/types/task";
import { addTask ,upsertQueue } from "@/lib/idb";

import { v4 as uuidv4 } from "uuid";



import TaskCard from "@/components/tasks/TaskCard";
import ViewTaskDialog from "@/components/tasks/ViewTaskDialog";
import EditTaskDialog from "@/components/tasks/EditTaskDialog";

import "@/pages/Dashboard/dashboard.css";

export default function Dashboard() {

  // modals
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const { logout ,userEmail } = useAuthStore();
  const { tasks, createTask, toggleComplete, deleteTask,reloadTasks  } = useTasksEngine();

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // theme toggle
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.body.classList.toggle("light", next === "light");
  };

  // add task
  const handleAdd = async () => {
    if (!input.trim()) return;

    let base64: string | null = null;

    if (imageFile) {
      base64 = await fileToBase64(imageFile);
    }

    await createTask(input.trim(), base64);

    setInput("");
    setImageFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  // edit save
  const handleEditSave = async (
  id: string,
  text: string,
  image?: string | null
) => {

  if (!userEmail) return;

  const updatedTask = {
    id,
    text,
    image: image ?? null,
    userEmail: userEmail,
    workspaceType: "personal",   // later dynamic
    updatedAt: Date.now(),
    dirty: true
  };

  // 1️ update local DB FIRST (source of truth)
  await addTask(updatedTask);

  // 2️ queue for sync engine
  await upsertQueue({
    id: uuidv4(),
    action: "update",
    taskId: id,
    userEmail: userEmail,
    workspaceType: "personal",
    payload: updatedTask,
    retry: 0,
    nextRetry: Date.now()
  });

  // 3️ try server immediately
  try {
    await fetch(`http://localhost:4000/tasks/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ text, image })
    });
  } catch {
    console.log("offline → queued");
  }

  // 4️reload from IDB (not page reload)
  await reloadTasks();
};



  return (
    <div>

      {/* theme */}
      <button id="theme-toggle-btn" onClick={toggleTheme}>🌓</button>

      <div id="todo-container">

        {/* HEADER */}
        <header className="topbar">
          <select>
            <option>🧑 Personal</option>
            <option>💼 Professional</option>
          </select>

          <button onClick={logout}>Logout</button>
          <button>Stress</button>
        </header>

        {/* INPUT */}
        <section className="task-input">

          {/* hidden file */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setImageFile(file);
            }}
          />

          {/* clip */}
          <button
            onClick={() => fileRef.current?.click()}
            className="clip-btn"
          >
            📎
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add task..."
          />

          <button onClick={handleAdd}>Add</button>
        </section>

        {/* ACTIVE TASKS */}
        <h3>Active Tasks</h3>

        {tasks.filter(t => !t.completed).map(t => (
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
                body: JSON.stringify({
                  toEmail: email,
                  taskId: task.id
                })
              });
            }}
          />
        ))}

        {/* COMPLETED */}
        <h3>Completed Tasks</h3>

        {tasks.filter(t => t.completed).map(t => (
          <TaskCard
            key={t.id}
            task={t}
            onDelete={deleteTask}
            onToggle={toggleComplete}
            onEdit={(task) => setEditTask(task)}
            onView={(task) => setViewTask(task)}
            onShare={() => {}}
          />
        ))}

      </div>

      {/* VIEW MODAL */}
      <ViewTaskDialog
        open={!!viewTask}
        onOpenChange={() => setViewTask(null)}
        task={viewTask}
      />

      {/* EDIT MODAL */}
      <EditTaskDialog
        open={!!editTask}
        onOpenChange={() => setEditTask(null)}
        task={editTask}
        onSave={handleEditSave}
      />



    </div>
  );
}
