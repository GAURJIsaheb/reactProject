import { Anchor, Moon, Sun, LogOut } from "lucide-react";

type Props = {
  workspace: string;
  setWorkspace: (v: string) => void;
  userEmail?: string | null;
  theme: string;
  toggleTheme: () => void;
  logout: () => void;
};

export default function HeaderSection({
  workspace,
  setWorkspace,
  userEmail,
  theme,
  toggleTheme,
  logout,
}: Props) {
  return (
    <header className="flex items-center justify-between flex-wrap gap-3 px-5 py-4 mb-7
    bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl
    shadow-[0_0_0_1px_rgba(99,102,241,0.1),0_20px_60px_rgba(0,0,0,0.4)]
    relative overflow-hidden">

      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-indigo-500/70 to-transparent"/>

      <div className="flex items-center gap-2">
        <div className="w-8.5 h-8.5 rounded-xl flex items-center justify-center text-white
        bg-linear-to-br from-indigo-500 to-pink-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]">
          <Anchor size={16}/>
        </div>

        <span className="text-lg font-extrabold tracking-tight
        bg-linear-to-br from-indigo-300 via-pink-400 to-cyan-400
        bg-clip-text text-transparent">
          FlowTask
        </span>

        <select
          value={workspace}
          onChange={(e) => setWorkspace(e.target.value)}
          className="px-2 py-2 text-[13px] font-semibold rounded-xl
          bg-background border border-border text-foreground outline-none
          hover:bg-muted hover:border-border"
        >
          <option value="personal">🧑 Personal</option>
          <option value="professional">💼 Professional</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        {userEmail && (
          <div className="px-3 py-1.5 rounded-full text-[11px] max-w-40 truncate
          bg-background border border-border text-foreground font-mono">
            {userEmail}
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="w-9.5 h-9.5 rounded-xl flex items-center justify-center
          bg-background border border-border text-foreground
          hover:bg-white/20 hover:background hover:scale-110 transition"
        >
          {theme === "dark" ? <Moon size={15}/> : <Sun size={15}/>}
        </button>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold
          bg-red-500/20 border border-red-400/40 text-red-300
          hover:bg-red-500/30 hover:scale-105 transition"
        >
          <LogOut size={14}/>
          Logout
        </button>
      </div>
    </header>
  );
}
