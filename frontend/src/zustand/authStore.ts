import { create } from "zustand";
import { clearAllUserData } from "@/lib/idb";

interface AuthState {
  token: string | null;
  userName: string | null;
  userEmail: string | null;
  setAuth: (token: string, name: string, email: string) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("token"),
  userName: localStorage.getItem("userName"),
  userEmail: localStorage.getItem("userEmail"),

  setAuth: (token, name, email) => {
    localStorage.setItem("token", token);
    localStorage.setItem("userName", name);
    localStorage.setItem("userEmail", email);

    set({ token, userName: name, userEmail: email });
  },

  logout: async () => {
    localStorage.clear();

    //  clear offline DB also
    await clearAllUserData();

    set({ token: null, userName: null, userEmail: null });

    window.location.href = "/login";
  },
}));