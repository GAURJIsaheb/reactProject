const API_BASE = "http://localhost:4000";

export interface LoginPayload {
  name: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  user: {
    name: string;
    email: string;
  };
}

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Login failed");
  }

  return data;
}


export function authHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token
  };
}
