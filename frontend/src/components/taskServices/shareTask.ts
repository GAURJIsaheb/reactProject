import { authHeaders } from "@/api/authApi";
import type { Task } from "@/types/task";

export async function shareTask(
  task: Task,
  toEmail: string,
  token: string,
  workspaceType: string
) {
  try {
    const res = await fetch("/share", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        toEmail,
        taskId: task.id,
        createdBy: task.userEmail,
        workspaceType
      })
    });

    if (!res.ok) throw new Error("share fail");

  } catch {
    console.log("share failed");
  }
}