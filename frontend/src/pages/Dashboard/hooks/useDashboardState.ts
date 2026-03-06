import { useState, useRef } from "react";
import type { Task } from "@/shared/types/task";

export function useDashboardState() {
  const [loading, setLoading] = useState(true);

  const [viewTask, setViewTask] = useState<Task | null>(null);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<string>("new");

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const taskInputRef = useRef<HTMLInputElement>(null);

  return {
    loading, setLoading,
    viewTask, setViewTask,
    search, setSearch,
    sort, setSort,
    activeSectionId, setActiveSectionId,
    input, setInput,
    imageFile, setImageFile,
    reminderDate, setReminderDate,
    reminderTime, setReminderTime,
    workspaceId, setWorkspaceId,
    taskInputRef
  };
}
