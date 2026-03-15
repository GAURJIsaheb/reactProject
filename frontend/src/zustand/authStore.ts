import { create } from "zustand";
import { clearSyncTimestamps } from "@/infrastructure/mongoSync/sync";

interface AuthState {
  token: string | null;
  userName: string | null;
  userEmail: string | null;
  userId: string | null;
  role: string | null;
  avatarUrl: string | null;

  setAuth: (
    token: string,
    name: string,
    email: string,
    userId: string,
    role: string,
    avatarUrl?: string | null,
  ) => void;
  setAvatarUrl: (avatarUrl: string | null) => void;

  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("token"),
  userName: localStorage.getItem("userName"),
  userEmail: localStorage.getItem("userEmail"),
  userId: localStorage.getItem("userId"),
  role: localStorage.getItem("role"),
  avatarUrl: localStorage.getItem("avatarUrl"),

  setAuth: (token, name, email, userId, role, avatarUrl = null) => {
    localStorage.setItem("token", token);
    localStorage.setItem("userName", name);
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userId", userId);
    localStorage.setItem("role", role);
    if (avatarUrl) {
      localStorage.setItem("avatarUrl", avatarUrl);
    } else {
      localStorage.removeItem("avatarUrl");
    }

    set({
      token,
      userName: name,
      userEmail: email,
      userId,
      role,
      avatarUrl,
    });
  },

  setAvatarUrl: (avatarUrl) => {
    if (avatarUrl) {
      localStorage.setItem("avatarUrl", avatarUrl);
    } else {
      localStorage.removeItem("avatarUrl");
    }

    set({ avatarUrl });
  },

  logout: async () => {
    clearSyncTimestamps();

    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    localStorage.removeItem("avatarUrl");

    set({
      token: null,
      userName: null,
      userEmail: null,
      userId: null,
      role: null,
      avatarUrl: null,
    });

    window.location.href = "/login";
  },
}));
