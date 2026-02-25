import { create } from "zustand";

interface AuthState {
  token: string | null;
  userName: string | null;
  userEmail: string | null;
  userId: string | null; 
  setAuth: (token: string, name: string, email: string, userId: string) => void; 
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("token"),
  userName: localStorage.getItem("userName"),
  userEmail: localStorage.getItem("userEmail"),
  userId: localStorage.getItem("userId"),

  setAuth: (token, name, email, userId) => {
    localStorage.setItem("token", token);
    localStorage.setItem("userName", name);
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userId", userId); 

    set({ token, userName: name, userEmail: email, userId }); 
  },

  logout: async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");

    set({ token:null, userName:null, userEmail:null });

    window.location.href="/login";
  },
}));