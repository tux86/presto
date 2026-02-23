import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { useT } from "./i18n";
import { ActivityReportEditor } from "./pages/ActivityReportEditor";
import { Clients } from "./pages/Clients";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Missions } from "./pages/Missions";
import { Reporting } from "./pages/Reporting";
import { useAuthStore } from "./stores/auth.store";
import { useConfigStore } from "./stores/config.store";
import { usePreferencesStore } from "./stores/preferences.store";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  const authEnabled = useConfigStore((s) => s.config?.authEnabled);

  if (authEnabled && !token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  const { token, fetchMe, isAuthenticated } = useAuthStore();
  const { config, loaded, fetchConfig } = useConfigStore();
  const initFromServerDefaults = usePreferencesStore((s) => s.initFromServerDefaults);
  const { t } = useT();

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (!loaded || !config) return;
    initFromServerDefaults(config.defaults);
  }, [loaded, config, initFromServerDefaults]);

  useEffect(() => {
    document.title = t("app.title");
  }, [t]);

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
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={!authEnabled || token ? <Navigate to="/" replace /> : <Login />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/activity/:id" element={<ActivityReportEditor />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/reporting" element={<Reporting />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
