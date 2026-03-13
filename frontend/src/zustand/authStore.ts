import { create } from "zustand";
import { clearSyncTimestamps } from "@/infrastructure/mongoSync/sync";

interface AuthState {
  token: string | null;
  userName: string | null;
  userEmail: string | null;
  userId: string | null;
  role: string | null;

  setAuth: (
    token: string,
    name: string,
    email: string,
    userId: string,
    role: string,
    
  ) => void;

  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("token"),
  userName: localStorage.getItem("userName"),
  userEmail: localStorage.getItem("userEmail"),
  userId: localStorage.getItem("userId"),
  role: localStorage.getItem("role"),

  setAuth: (token, name, email, userId, role) => {
    localStorage.setItem("token", token);
    localStorage.setItem("userName", name);
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userId", userId);
    localStorage.setItem("role", role);

    set({
      token,
      userName: name,
      userEmail: email,
      userId,
      role,
    });
  },

  logout: async () => {
    clearSyncTimestamps();

    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");

    set({
      token: null,
      userName: null,
      userEmail: null,
      userId: null,
      role: null,
    });

    window.location.href = "/login";
  },
}));