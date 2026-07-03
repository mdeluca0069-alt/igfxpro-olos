import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { AdminSidebar } from "./AdminSidebar";

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <AdminSidebar collapsed={!sidebarOpen} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-3 border-b border-slate-800 bg-slate-950 px-4">
          <button
            onClick={() => setSidebarOpen((p) => !p)}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-900 hover:text-slate-300"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">IGFXPRO</span>
            <span className="text-slate-700">·</span>
            <span className="text-[11px] text-slate-500">Broker Control Centre</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
