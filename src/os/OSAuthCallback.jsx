import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

/**
 * Handles Emergent Google OAuth callback.
 * URL format: /os#session_id=xxx
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
 */
export default function OSAuthCallback() {
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) { navigate("/os", { replace: true }); return; }
    const sessionId = m[1];
    const BACKEND = process.env.REACT_APP_BACKEND_URL;
    axios.post(`${BACKEND}/api/os/auth/google/session`, {}, {
      headers: { "X-Session-ID": sessionId },
      withCredentials: true,
    })
      .then((r) => {
        try { localStorage.setItem("ur_admin_token", r.data.access_token); } catch (e) { /* ignore */ }
        setUser(r.data.user);
        window.history.replaceState({}, "", "/os");
        navigate("/os", { replace: true });
      })
      .catch(() => {
        setError("Google sign-in failed");
        setTimeout(() => navigate("/os/login", { replace: true }), 1500);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white">
      <p className="text-sm text-slate-400" data-testid="os-auth-callback">
        {error || "Signing you in…"}
      </p>
    </div>
  );
}
