import { GraduationCap } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

export function RootLayout() {
  return (
    <div className="min-h-svh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <GraduationCap className="h-4 w-4" aria-hidden />
            SWUST Campus Marketplace
          </p>
          <nav className="flex gap-4 text-sm">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? "font-medium text-slate-900" : "text-slate-500"
              }
            >
              Home
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
