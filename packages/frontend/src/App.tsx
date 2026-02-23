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
  const authDisabled = useConfigStore((s) => s.config?.authDisabled);

  if (!authDisabled && !token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  const { token, fetchMe, isAuthenticated } = useAuthStore();
  const { config, loaded: configLoaded, fetchConfig } = useConfigStore();
  const fetchSettings = usePreferencesStore((s) => s.fetchSettings);
  const settingsLoaded = usePreferencesStore((s) => s.loaded);
  const { t } = useT();

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Fetch user settings once auth is resolved
  useEffect(() => {
    if (!configLoaded || !config) return;
    if (config.authDisabled || isAuthenticated) {
      fetchSettings();
    }
  }, [configLoaded, config, isAuthenticated, fetchSettings]);

  useEffect(() => {
    document.title = t("app.title");
  }, [t]);

  useEffect(() => {
    if (!configLoaded) return;
    const authDisabled = config?.authDisabled ?? false;
    if (!authDisabled && token && !isAuthenticated) {
      fetchMe();
    }
  }, [token, isAuthenticated, fetchMe, configLoaded, config]);

  if (!configLoaded) {
    return null;
  }

  const authDisabled = config?.authDisabled ?? false;

  // Wait for settings before rendering (avoids theme flash)
  if ((authDisabled || isAuthenticated) && !settingsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={authDisabled || token ? <Navigate to="/" replace /> : <Login />} />
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
