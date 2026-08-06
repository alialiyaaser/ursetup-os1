import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { LogIn, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function AdminLogin() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">…</div>;
  if (user) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email.trim(), password);
      toast.success("Welcome back");
      navigate("/admin", { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: "radial-gradient(600px 300px at 20% 10%, rgba(255,255,255,0.08), transparent 60%), radial-gradient(500px 300px at 90% 90%, rgba(255,255,255,0.05), transparent 60%)"
      }} />
      <form onSubmit={submit} className="relative w-full max-w-md bg-[#0f0f0f] border border-white/10 p-9" data-testid="admin-login-form">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <p className="kicker">UR SETUP · ADMIN</p>
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">Sign in to the studio</h1>
        <p className="text-neutral-400 text-sm mb-8">Only authorized team members.</p>

        <label className="kicker mb-2 block">Email</label>
        <div className="relative mb-4">
          <Mail className="w-4 h-4 absolute top-3.5 start-3 text-neutral-500" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="admin-email-input"
            className="w-full bg-black/60 border border-white/15 ps-9 pe-4 py-3 text-white placeholder-neutral-500 focus:border-white/50"
            placeholder="admin@ursetup.sa"
          />
        </div>
        <label className="kicker mb-2 block">Password</label>
        <div className="relative mb-6">
          <KeyRound className="w-4 h-4 absolute top-3.5 start-3 text-neutral-500" />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="admin-password-input"
            className="w-full bg-black/60 border border-white/15 ps-9 pe-4 py-3 text-white placeholder-neutral-500 focus:border-white/50"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          data-testid="admin-login-submit"
          className="w-full inline-flex items-center justify-center gap-2 bg-white text-black py-3.5 font-semibold text-sm tracking-[0.22em] uppercase hover:bg-neutral-200 disabled:opacity-50 transition-colors duration-300"
        >
          <LogIn className="w-4 h-4" />
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-center text-xs text-neutral-500 mt-6">
          <a href="/" className="hover:text-white transition-colors duration-300">← Back to site</a>
        </p>
      </form>
    </div>
  );
}
