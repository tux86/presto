import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.tsx";
import { Button, Spinner } from "./components/ui.tsx";
import { Clients } from "./pages/Clients.tsx";
import { Companies } from "./pages/Companies.tsx";
import { Editor } from "./pages/Editor.tsx";
import { Missions } from "./pages/Missions.tsx";
import { Reports } from "./pages/Reports.tsx";
import { useT } from "./prefs.tsx";
import { useStore } from "./store.tsx";

// Charts are the heaviest thing we ship and only one page needs them.
const Summary = lazy(() => import("./pages/Summary.tsx").then((m) => ({ default: m.Summary })));

export function App() {
  const { status, reload } = useStore();
  const { t } = useT();

  if (status === "loading") return <Spinner label={t("common.loading")} />;

  if (status === "error") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <div>
          <h1 className="text-lg font-semibold text-heading">{t("error.title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("error.offline")}</p>
        </div>
        <Button onClick={() => void reload()}>{t("common.retry")}</Button>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Reports />} />
        <Route path="reports/:id" element={<Editor />} />
        <Route path="clients" element={<Clients />} />
        <Route path="missions" element={<Missions />} />
        <Route path="companies" element={<Companies />} />
        <Route
          path="summary"
          element={
            <Suspense fallback={<Spinner />}>
              <Summary />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
