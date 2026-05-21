const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

function getErrorMessage(data: { error?: string; message?: string } | null | undefined, fallback: string) {
  return data?.error || data?.message || fallback;
}

/* LOGIN */
export async function loginUser(payload: {
  email: string;
  password: string;
}) {
  const res = await fetch(`${API}/auth/login`, {
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
  const res = await fetch(`${API}/auth/signup`, {
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
