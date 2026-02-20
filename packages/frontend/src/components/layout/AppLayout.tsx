import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "../ui/CommandPalette";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-page">
      <Sidebar />
      <CommandPalette />
      <main className="px-4 pt-6 pb-20 md:ml-56 md:p-8 md:pb-8">
        <Outlet />
      </main>
    </div>
  );
}
