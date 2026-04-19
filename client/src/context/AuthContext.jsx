import { createContext, useContext, useMemo, useState, useEffect } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

const STORAGE_USER = "sa_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("sa_token");
    const u = localStorage.getItem(STORAGE_USER);
    if (t && u) {
      try {
        setToken(t);
        setUser(JSON.parse(u));
      } catch {
        localStorage.removeItem("sa_token");
        localStorage.removeItem(STORAGE_USER);
      }
    }
    setReady(true);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/api/auth/login", { email, password });
    localStorage.setItem("sa_token", data.token);
    localStorage.setItem(STORAGE_USER, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const signup = async ({ name, email, password }) => {
    const { data } = await api.post("/api/auth/signup", { name, email, password });
    localStorage.setItem("sa_token", data.token);
    localStorage.setItem(STORAGE_USER, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("sa_token");
    localStorage.removeItem(STORAGE_USER);
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      ready,
      isAuthenticated: Boolean(token && user),
      login,
      signup,
      logout,
    }),
    [user, token, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
