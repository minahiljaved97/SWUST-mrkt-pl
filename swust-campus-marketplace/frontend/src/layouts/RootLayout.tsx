import { GraduationCap } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { Button } from "../components";
import { useAuth } from "../features/auth/AuthContext";

export function RootLayout() {
  const { isAuthenticated, isAdmin, user, logout, isBootstrapping } = useAuth();

  return (
    <div className="min-h-svh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <GraduationCap className="h-4 w-4" aria-hidden />
            SWUST Campus Marketplace
          </p>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? "font-medium text-slate-900" : "text-slate-500"
              }
            >
              Home
            </NavLink>
            {isAuthenticated ? (
              <>
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    isActive ? "font-medium text-slate-900" : "text-slate-500"
                  }
                >
                  Profile
                </NavLink>
                {isAdmin ? (
                  <NavLink
                    to="/admin/users"
                    className={({ isActive }) =>
                      isActive ? "font-medium text-slate-900" : "text-slate-500"
                    }
                  >
                    Admin
                  </NavLink>
                ) : null}
                <span className="hidden text-slate-400 sm:inline">
                  {user?.first_name || user?.email}
                </span>
                <Button
                  variant="ghost"
                  disabled={isBootstrapping}
                  onClick={() => {
                    void logout();
                  }}
                >
                  Log out
                </Button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    isActive ? "font-medium text-slate-900" : "text-slate-500"
                  }
                >
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  className={({ isActive }) =>
                    isActive ? "font-medium text-slate-900" : "text-slate-500"
                  }
                >
                  Register
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
