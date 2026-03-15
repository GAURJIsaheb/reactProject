
import { API_BASE } from "@/infrastructure/api/base";

function getErrorMessage(data: { error?: string; message?: string } | null | undefined, fallback: string) {
  return data?.error || data?.message || fallback;
}

/* LOGIN */
export async function loginUser(payload: {
  email: string;
  password: string;
}) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(getErrorMessage(data, "Login failed"));
  return data;
}

/* SIGNUP */
export async function signupUser(payload: {
  name: string;
  email: string;
  password: string;
}) {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(getErrorMessage(data, "Signup failed"));
  return data;
}

export const authHeaders = (token: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`
});

export async function uploadProfileAvatar(file: File, token: string) {
  const formData = new FormData();
  formData.append("avatar", file);

  const res = await fetch(`${API_BASE}/auth/avatar`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(getErrorMessage(data, "Avatar upload failed"));
  return data;
}
