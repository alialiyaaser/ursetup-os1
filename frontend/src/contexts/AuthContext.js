import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);
const TOKEN_KEY = "ur_admin_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (err) {
      console.warn("[AuthContext] cannot read token from localStorage:", err);
      return null;
    }
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  const applyToken = useCallback((tk) => {
    if (tk) {
      api.defaults.headers.common.Authorization = `Bearer ${tk}`;
      try { localStorage.setItem(TOKEN_KEY, tk); }
      catch (err) { console.warn("[AuthContext] cannot persist token:", err); }
    } else {
      delete api.defaults.headers.common.Authorization;
      try { localStorage.removeItem(TOKEN_KEY); }
      catch (err) { console.warn("[AuthContext] cannot clear token:", err); }
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    applyToken(token);
    let cancelled = false;
    api
      .get("/auth/me")
      .then((r) => { if (!cancelled) setUser(r.data); })
      .catch(() => { if (!cancelled) { applyToken(null); setToken(null); setUser(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, applyToken]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    applyToken(data.access_token);
    setUser(data.user);
    setToken(data.access_token);
    return data.user;
  }, [applyToken]);

  const logout = useCallback(() => {
    applyToken(null);
    setToken(null);
    setUser(null);
  }, [applyToken]);

  const value = useMemo(() => ({ user, token, loading, login, logout, setUser }), [user, token, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function hasRole(user, ...roles) {
  return Boolean(user && roles.includes(user.role));
}
