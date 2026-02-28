export function saveAuth(token: string, name: string, email: string) {
  localStorage.setItem("token", token);
  localStorage.setItem("userName", name);
  localStorage.setItem("userEmail", email);
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function clearAuth() {
  localStorage.clear();
}
