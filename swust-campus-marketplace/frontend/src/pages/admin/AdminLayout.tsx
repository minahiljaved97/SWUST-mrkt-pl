import { NavLink, Outlet } from "react-router-dom";

import { PageHeader } from "../../components";

const LINKS = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/listings", label: "Listings" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/reports", label: "Reports" },
  { to: "/admin/statistics", label: "Statistics" },
] as const;

export function AdminLayout() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Campus dashboard"
        description="Moderation tools and marketplace statistics for SWUST staff."
      />
      <nav
        className="flex gap-2 overflow-x-auto pb-1"
        aria-label="Admin sections"
      >
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={"end" in link ? link.end : false}
            className={({ isActive }) =>
              `shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
