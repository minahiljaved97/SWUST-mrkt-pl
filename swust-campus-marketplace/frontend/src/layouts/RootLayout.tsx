import {
  GraduationCap,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  PlusCircle,
  Store,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import { Button } from "../components";
import { useAuth } from "../features/auth/AuthContext";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Store;
  end?: boolean;
};

export function RootLayout() {
  const { isAuthenticated, isAdmin, user, logout, isBootstrapping } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const menuId = useId();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  const primaryLinks: NavItem[] = isAuthenticated
    ? [
        { to: "/", label: "Home", icon: Store, end: true },
        { to: "/marketplace", label: "Marketplace", icon: Package },
        { to: "/listings/new", label: "Sell", icon: PlusCircle },
        { to: "/listings/mine", label: "My listings", icon: Package },
        { to: "/favorites", label: "Favorites", icon: Heart },
        { to: "/messages", label: "Messages", icon: MessageSquare },
        { to: "/profile", label: "Profile", icon: UserRound },
        ...(isAdmin
          ? [{ to: "/admin", label: "Admin", icon: LayoutDashboard } as NavItem]
          : []),
      ]
    : [
        { to: "/", label: "Home", icon: Store, end: true },
        { to: "/login", label: "Login", icon: UserRound },
        { to: "/register", label: "Register", icon: PlusCircle },
      ];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? "bg-brand-50 text-brand-900"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <div className="min-h-svh text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-3.5 lg:px-8">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2.5 text-sm font-semibold tracking-tight text-slate-900"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-900 text-white">
              <GraduationCap className="h-4 w-4" aria-hidden />
            </span>
            <span className="truncate">
              <span className="block leading-tight">SWUST</span>
              <span className="block text-xs font-medium text-slate-500">
                Campus Marketplace
              </span>
            </span>
          </Link>

          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Main"
          >
            {primaryLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={linkClass}
              >
                {item.label}
              </NavLink>
            ))}
            {isAuthenticated ? (
              <div className="ml-2 flex items-center gap-2 border-l border-slate-200 pl-3">
                <span className="hidden max-w-36 truncate text-sm text-slate-500 xl:inline">
                  {user?.first_name || user?.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isBootstrapping}
                  leftIcon={<LogOut className="h-4 w-4" aria-hidden />}
                  onClick={() => {
                    void logout();
                  }}
                >
                  Log out
                </Button>
              </div>
            ) : null}
          </nav>

          <Button
            variant="secondary"
            size="sm"
            className="lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls={menuId}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? (
              <X className="h-4 w-4" aria-hidden />
            ) : (
              <Menu className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <nav
            id={menuId}
            aria-label="Mobile"
            className="absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-l border-slate-200 bg-white p-4 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Menu</p>
              <Button
                variant="ghost"
                size="sm"
                className="px-2"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
              {primaryLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `inline-flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                        isActive
                          ? "bg-brand-50 text-brand-900"
                          : "text-slate-700 hover:bg-slate-50"
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
            {isAuthenticated ? (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <p className="mb-3 truncate text-sm text-slate-500">
                  {user?.first_name || user?.email}
                </p>
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={isBootstrapping}
                  leftIcon={<LogOut className="h-4 w-4" aria-hidden />}
                  onClick={() => {
                    void logout();
                  }}
                >
                  Log out
                </Button>
              </div>
            ) : null}
          </nav>
        </div>
      ) : null}

      <main id="main-content" className="page-shell">
        <Outlet />
      </main>
    </div>
  );
}
