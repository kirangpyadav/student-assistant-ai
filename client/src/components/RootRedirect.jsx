import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** `/` and unknown paths: dashboard if logged in, otherwise login. */
export default function RootRedirect() {
  const { isAuthenticated, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading…
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}
