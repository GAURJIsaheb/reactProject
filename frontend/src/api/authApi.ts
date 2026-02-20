const API = "http://localhost:4000";

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
  if (!res.ok) throw new Error(data.error || "Login failed");

  localStorage.setItem("token", data.token);
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
  if (!res.ok) throw new Error(data.error || "Signup failed");

  localStorage.setItem("token", data.token);
  return data;
}

export const authHeaders = (token: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`
});