import { useState } from "react";
import { Eye, EyeOff, Anchor,Check ,X} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { signupUser } from "@/api/authApi";
import { useAuthStore } from "@/zustand/authStore";
import { saveUser } from "@/lib/idb";

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "One number", test: (pw) => /[0-9]/.test(pw) },
  { label: "One special character", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

function getStrength(pw: string): number {
  return PASSWORD_RULES.filter((r) => r.test(pw)).length;
}

export default function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(""); // ✅ added
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);

  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const strength = getStrength(password);

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  const strengthColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-green-500",
    "bg-emerald-500",
  ];

  const strengthTextColors = [
    "text-red-400",
    "text-orange-400",
    "text-yellow-400",
    "text-green-400",
    "text-emerald-400",
  ];

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Perfect"][strength];

  /* ---------------- SUBMIT ---------------- */
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError("All fields required");
      return;
    }

    if (strength < 3) {
      setError("Password too weak");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    try {
      setLoading(true);

      const data = await signupUser({
        name: username.trim(),
        email: email.trim(),
        password,
      });

      // zustand auth set
      setAuth(data.token, data.user.name, data.user.email,data.user.userId);

      // save user to indexeddb
      await saveUser({
        email: data.user.email,
        name: data.user.name,
      });

      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07080f] p-6 font-sans">

      {/* Grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.04)_1px,transparent_1px)] bgsize-[40px_40px] mask-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.5)_0%,transparent_75%)]" />

      {/* Glow Orbs */}
      <div className="pointer-events-none absolute -top-44 -right-24 h-125 w-125 rounded-full blur-[80px] bg-[radial-gradient(circle,rgba(139,92,246,0.2)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-87.5 w-87.5 rounded-full blur-[80px] bg-[radial-gradient(circle,rgba(236,72,153,0.1)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute top-1/2 right-1/4 h-50 w-50 rounded-full blur-[80px] bg-[radial-gradient(circle,rgba(99,102,241,0.12)_0%,transparent_70%)]" />

      <div className="relative z-10 w-115 rounded-[28px] border border-purple-500/20 bg-[rgba(12,14,26,0.88)] p-10 backdrop-blur-2xl shadow-[0_0_0_1px_rgba(139,92,246,0.08),0_0_80px_rgba(139,92,246,0.1),0_40px_80px_rgba(0,0,0,0.6)]">

        <div className="mb-8 -mx-10 -mt-10 h-0.5 rounded-t-[28px] bg-linear-to-r from-transparent via-purple-500 to-transparent opacity-80" />

        {/* Logo */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-purple-500 to-pink-500 shadow-[0_0_20px_rgba(139,92,246,0.4)]">
            <Anchor size={20} className="text-white" />
          </div>
          <span className="bg-linear-to-br from-gray-200 to-purple-300 bg-clip-text text-lg font-extrabold text-transparent">
            TaskFlow
          </span>
        </div>

        <h1 className="mb-1 bg-linear-to-br from-white to-purple-300 bg-clip-text text-2xl font-black text-transparent">
          Create account
        </h1>

        <form onSubmit={handleSignup} className="space-y-4">

          {/* Username */}
          <input
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />

          {/* EMAIL FIELD */}
          <input
            type="email"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
          />

          {/* Password */}
            <div className="relative">
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[1.5px] text-gray-500">
                Create Password
            </label>

            <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused(null)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm font-semibold text-gray-200 outline-none transition focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                placeholder="••••••••••"
            />

            <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-9.5 text-gray-500 hover:text-purple-400"
            >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            </div>
            
            {password.length > 0 && (
            <>
                <div className="flex items-center justify-between">
                <div className="flex flex-1 gap-1 mr-2">
                    {[1,2,3,4,5].map((n) => (
                    <div
                        key={n}
                        className={`h-0.75 flex-1 rounded-full ${
                        n <= strength
                            ? strengthColors[strength - 1]
                            : "bg-white/10"
                        }`}
                    />
                    ))}
                </div>

                <span className={`text-[10px] font-mono font-semibold ${
                    strength > 0 ? strengthTextColors[strength - 1] : "text-gray-500"
                }`}>
                    {strengthLabel}
                </span>
                </div>

                <div className="mt-2 space-y-1 font-mono text-[11px]">
                {PASSWORD_RULES.map((rule) => {
                    const pass = rule.test(password);
                    return (
                    <div
                        key={rule.label}
                        className={`flex items-center gap-2 ${
                        pass ? "text-emerald-400" : "text-gray-500"
                        }`}
                    >
                        {pass ? <Check size={12} /> : <X size={12} />}
                        {rule.label}
                    </div>
                    );
                })}
                </div>
            </>
            )}
        

          {/* Confirm Password */}
            <div className="relative">
            <label className={`mb-2 block text-[10px] font-bold uppercase tracking-[1.5px] ${
                focused === "confirm" ? "text-purple-400" : "text-gray-500"
            }`}>
                Confirm Password
            </label>

            <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => setFocused("confirm")}
                onBlur={() => setFocused(null)}
                className={`w-full rounded-xl border bg-white/5 px-4 py-3 pr-11 text-sm font-semibold text-gray-200 outline-none transition
                ${
                passwordsMatch
                    ? "border-emerald-400/40"
                    : passwordsMismatch
                    ? "border-red-400/40"
                    : "border-white/10"
                }
                focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20`}
                placeholder="••••••••••"
            />

            <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-4 top-9.5 text-gray-500 hover:text-purple-400"
            >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>

            {confirmPassword.length > 0 && (
                <div className={`mt-2 flex items-center gap-2 text-[11px] font-mono ${
                passwordsMatch ? "text-emerald-400" : "text-red-400"
                }`}>
                {passwordsMatch ? <Check size={12} /> : <X size={12} />}
                {passwordsMatch ? "Passwords match" : "Passwords don't match"}
                </div>
            )}
            </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <button
            disabled={loading}
            className="w-full bg-linear-to-r from-purple-500 to-pink-500 py-3 rounded-xl text-white font-bold"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <div className="text-center mt-4 text-sm text-gray-400">
          Already have account?{" "}
          <Link to="/login" className="text-purple-400">Sign in</Link>
        </div>
      </div>
    </div>
  );
}