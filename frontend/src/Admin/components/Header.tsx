import { Shield,LogOut } from "lucide-react";
import { NEON } from "../utils/helpers";
import { useAuthStore } from "@/zustand/authStore";
type Props = {
  lastRefresh: number;
  onRefresh: () => void;
};

export default function Header({ }: Props) {
  const { logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 border-b border-zinc-900 backdrop-blur bg-[#080808]/90">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center border"
          style={{
            background: "rgba(0,245,255,0.08)",
            borderColor: "rgba(0,245,255,0.2)",
          }}
        >
          <Shield size={20} color={NEON.cyan} />
        </div>

        <div>
          <div className="text-white font-extrabold tracking-[3px]">
            SUPER ADMIN
          </div>
          <div className="text-[10px] text-zinc-500">Analytics Command Center</div>
        </div>
      </div>

      <div className="flex items-center gap-4">


        <button
          onClick={() => logout()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-mono transition-opacity hover:opacity-80"
          style={{
            color: NEON.pink,
            background: "rgba(255,55,95,0.08)",
            borderColor: "rgba(255,55,95,0.2)",
          }}
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </header>
  );
}