import { useEffect, useState } from "react";
import { loginUser } from "@/services/auth.service";
import { useAuthStore } from "@/zustand/authStore";
import { Eye, EyeOff, Anchor } from "lucide-react";
import { Link } from "react-router-dom";
import { saveUser, clearAllUserData } from "@/infrastructure/indexDb/idb";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const { token, setAuth } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      window.location.href = "/dashboard";
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      setLoading(true);

      const data = await loginUser({ email: trimmedEmail, password });

      // detect user switch
      if (data.user.email !== email) {
        await clearAllUserData(); 
      }

      // save identity in IndexedDB
      await saveUser({
        userId: data.user.userId,
        email: data.user.email,
        name: data.user.name,
        lastLoginAt: Date.now()
      });

      setAuth(
        data.token,
        data.user.name,
        data.user.email,
        data.user.userId,
        data.user.role,
        data.user.avatarUrl ?? null,
      );

  const pendingInvite = sessionStorage.getItem("pendingInviteUrl");
if (pendingInvite) {
  sessionStorage.removeItem("pendingInviteUrl");
  window.location.href = pendingInvite;
} else {
  window.location.reload();
}
} catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07080f] font-sans">

      {/* Grid Background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.04)_1px,transparent_1px)] bg-size-[40px_40px] mask-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.6)_0%,transparent_75%)]" />

      {/* Glow Orbs */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-125 w-125 rounded-full blur-[80px] bg-[radial-gradient(circle,rgba(99,102,241,0.18)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-100 w-100 rounded-full blur-[80px] bg-[radial-gradient(circle,rgba(139,92,246,0.12)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute top-1/2 left-2/3 h-500 w-50 rounded-full blur-[80px] bg-[radial-gradient(circle,rgba(6,182,212,0.1)_0%,transparent_70%)]" />

      {/* Card */}
      <div className="relative z-10 w-105 rounded-[28px] border border-indigo-500/20 bg-[rgba(12,14,26,0.85)] p-10 backdrop-blur-2xl shadow-[0_0_0_1px_rgba(99,102,241,0.08),0_0_80px_rgba(99,102,241,0.1),0_40px_80px_rgba(0,0,0,0.6)] animate-[fadeIn_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">

        <div className="mb-8 -mx-10 -mt-10 h-0.5 rounded-t-[28px] bg-linear-to-r from-transparent via-indigo-500 to-transparent opacity-80" />

        {/* Logo */}
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            <Anchor size={20} className="text-white" />
          </div>
          <span className="bg-linearto-br from-gray-200 to-indigo-300 bg-clip-text text-lg font-extrabold text-transparent">
            TaskFlow
          </span>
        </div>

        <h1 className="mb-1 bg-linear-to-br from-white to-indigo-300 bg-clip-text text-2xl font-black text-transparent">
          Welcome back
        </h1>
        <p className="mb-8 font-mono text-xs text-gray-500">
          // sign in to continue
        </p>

        <form onSubmit={handleLogin} className="space-y-4">

          {/* Email */}
          <div>
            <label className={`mb-2 block text-[10px] font-bold uppercase tracking-[1.5px] ${
              focused === "email" ? "text-indigo-400" : "text-gray-500"
            }`}>
              Email Address
            </label>
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-200 outline-none transition focus:border-indigo-500/50 focus:bg-indigo-500/5 focus:ring-2 focus:ring-indigo-500/20"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <label className={`mb-2 block text-[10px] font-bold uppercase tracking-[1.5px] ${
              focused === "password" ? "text-indigo-400" : "text-gray-500"
            }`}>
              Password
            </label>
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm font-semibold text-gray-200 outline-none transition focus:border-indigo-500/50 focus:bg-indigo-500/5 focus:ring-2 focus:ring-indigo-500/20"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              required
            />
            <button
              type="button"
              className="absolute right-4 top-9.5 text-gray-500 transition hover:text-indigo-400"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Forgot */}
          // Login form ke neeche add karo
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-[12px] text-indigo-400 hover:text-indigo-300 transition mt-2 underline underline-offset-2"
          >
            Forgot password?
          </button>

          {/* Error */}
          {error && (
            <div className="animate-[shake_0.3s_ease] rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-400">
              ⚠ {error}
            </div>
          )}

          <button
            className="relative mt-2 w-full overflow-hidden rounded-xl bg-linear-to-br from-indigo-500 to-purple-500 px-4 py-3 text-sm font-extrabold text-white shadow-[0_0_30px_rgba(99,102,241,0.4)] transition hover:-translate-y-px hover:shadow-[0_0_45px_rgba(99,102,241,0.55)] active:scale-95 disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="font-mono text-[11px] text-gray-500">new here?</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="text-center font-mono text-sm text-gray-500">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="font-semibold text-indigo-400 hover:text-indigo-300"
          >
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
