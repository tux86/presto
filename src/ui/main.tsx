import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App.tsx";
import "./index.css";
import { PrefsProvider } from "./prefs.tsx";
import { StoreProvider } from "./store.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrefsProvider>
      <StoreProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StoreProvider>
    </PrefsProvider>
  </StrictMode>,
);
