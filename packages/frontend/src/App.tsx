import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/auth.store";
import { useConfigStore } from "./stores/config.store";
import { AppLayout } from "./components/layout/AppLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { CraEditor } from "./pages/CraEditor";
import { Clients } from "./pages/Clients";
import { Missions } from "./pages/Missions";
import { Reporting } from "./pages/Reporting";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  const authEnabled = useConfigStore((s) => s.config?.authEnabled);

  if (!authEnabled) {
    return <>{children}</>;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { token, fetchMe, isAuthenticated } = useAuthStore();
  const { config, loaded, fetchConfig } = useConfigStore();

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (!loaded) return;
    const authEnabled = config?.authEnabled ?? true;
    if (authEnabled && token && !isAuthenticated) {
      fetchMe();
    }
  }, [token, isAuthenticated, fetchMe, loaded, config]);

  if (!loaded) {
    return null;
  }

  const authEnabled = config?.authEnabled ?? true;

  return (
    <Routes>
      <Route
        path="/login"
        element={!authEnabled || token ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/activity/:id" element={<CraEditor />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/missions" element={<Missions />} />
        <Route path="/reporting" element={<Reporting />} />
      </Route>
    </Routes>
  );
}
