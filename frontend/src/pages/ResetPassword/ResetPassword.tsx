import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const API = `http://${window.location.hostname}:4000`;

export default function ResetPassword() {
  const [params]                    = useSearchParams();
  const token                       = params.get("token") || "";
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);
  const navigate                    = useNavigate();

  const handleReset = async () => {
    if (!password || !confirm) return toast.error("Fill all fields");
    if (password !== confirm)  return toast.error("Passwords don't match");
    if (password.length < 6)   return toast.error("Min 6 characters");
    if (!token)                return toast.error("Invalid reset link");

    setLoading(true);
    try {
      const res = await fetch(`${API}/password/reset`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();
      if (!res.ok) return toast.error(data.error || "Reset failed");

      setSuccess(true);
      toast.success("Password reset! Redirecting...");
      setTimeout(() => navigate("/login"), 2500);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0e1a] flex items-center justify-center px-4 font-['Syne']">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-125 h-125 rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-125 h-125 rounded-full bg-pink-600/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-[#12142a]/80 backdrop-blur-xl border border-violet-500/20 rounded-3xl p-8 shadow-[0_0_60px_rgba(139,92,246,0.1)]">
          <div className="h-0.5 bg-linear-to-r from-transparent via-violet-500 to-transparent -mx-8 -mt-8 mb-8 rounded-t-3xl" />

          {!success ? (
            <>
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔑</span>
                </div>
                <h1 className="text-2xl font-extrabold text-[#e8eaf0] mb-1">Set New Password</h1>
                <p className="text-sm text-gray-500">Choose a strong password</p>
              </div>

              <div className="flex flex-col gap-4">
                {/* New Password */}
                <div>
                  <label className="block text-[10px] font-bold tracking-[1.5px] uppercase text-gray-600 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-4 py-3.5 pr-11 bg-white/5 border border-white/10 rounded-[14px] text-[#e8eaf0] text-[15px] outline-none transition-all focus:border-violet-500/50 focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)] placeholder:text-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm */}
                <div>
                  <label className="block text-[10px] font-bold tracking-[1.5px] uppercase text-gray-600 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleReset()}
                    placeholder="Same as above"
                    className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-[14px] text-[#e8eaf0] text-[15px] outline-none transition-all focus:border-violet-500/50 focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)] placeholder:text-gray-700"
                  />
                </div>

                {/* Password strength indicator */}
                {password && (
                  <div className="flex gap-1.5">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          password.length > i * 3
                            ? password.length < 6  ? "bg-red-500"
                            : password.length < 10 ? "bg-amber-500"
                            : "bg-emerald-500"
                            : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                )}

                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="w-full py-3.5 rounded-[14px] bg-linear-to-br from-violet-500 to-pink-500 text-white font-extrabold text-[15px] shadow-[0_0_24px_rgba(139,92,246,0.35)] hover:scale-[1.02] hover:shadow-[0_0_36px_rgba(139,92,246,0.5)] active:scale-[0.99] transition disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-xl font-extrabold text-[#e8eaf0] mb-2">Password Reset!</h2>
              <p className="text-sm text-gray-500">Redirecting to login...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}