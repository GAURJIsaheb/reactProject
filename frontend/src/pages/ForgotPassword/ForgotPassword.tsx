import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const API = `http://${window.location.hostname}:4000`;

export default function ForgotPassword() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const navigate              = useNavigate();

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) return toast.error("Enter your email");
    console.log("Calling:", `${API}/password/forgot`); 

    setLoading(true);
    try {
      const res = await fetch(`${API}/password/forgot`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: trimmed }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || "Something went wrong. Try again.");
      }

      setSent(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0e1a] flex items-center justify-center px-4 font-['Syne']">
      {/* Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-125 h-125 rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-125 h-125 rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-[#12142a]/80 backdrop-blur-xl border border-indigo-500/20 rounded-3xl p-8 shadow-[0_0_60px_rgba(99,102,241,0.1)]">

          {/* Top glow line */}
          <div className="h-0.5 bg-linear-to-r from-transparent via-indigo-500 to-transparent -mx-8 -mt-8 mb-8 rounded-t-3xl" />

          {!sent ? (
            <>
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔐</span>
                </div>
                <h1 className="text-2xl font-extrabold text-[#e8eaf0] mb-1">Forgot Password?</h1>
                <p className="text-sm text-gray-500">Enter your email and we'll send a reset link</p>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-[1.5px] uppercase text-gray-600 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-[14px] text-[#e8eaf0] text-[15px] outline-none transition-all focus:border-indigo-500/50 focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] placeholder:text-gray-700"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full py-3.5 rounded-[14px] bg-linear-to-br from-indigo-500 to-violet-500 text-white font-extrabold text-[15px] shadow-[0_0_24px_rgba(99,102,241,0.35)] hover:scale-[1.02] hover:shadow-[0_0_36px_rgba(99,102,241,0.5)] active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>

                <button
                  onClick={() => navigate("/login")}
                  className="text-[12px] text-gray-600 hover:text-gray-400 transition text-center mt-1"
                >
                  ← Back to login
                </button>
              </div>
            </>
          ) : (
            /* Success State */
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">📬</span>
              </div>
              <h2 className="text-xl font-extrabold text-[#e8eaf0] mb-2">Check your inbox</h2>
              <p className="text-sm text-gray-500 mb-1">
                If <span className="text-indigo-400 font-semibold">{email}</span> is registered,
              </p>
              <p className="text-sm text-gray-500 mb-8">a reset link has been sent via AWS SQS ⚡</p>
              <button
                onClick={() => navigate("/login")}
                className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm font-semibold hover:bg-white/10 transition"
              >
                ← Back to login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
