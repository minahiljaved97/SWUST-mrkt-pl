import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { fetchAdminSummary } from "../../api/admin";
import { getApiErrorMessage } from "../../api/client";
import { ErrorMessage, Loading } from "../../components";

const CARDS: {
  key: keyof Awaited<ReturnType<typeof fetchAdminSummary>>;
  label: string;
  to: string;
}[] = [
  { key: "total_students", label: "Total students", to: "/admin/users" },
  { key: "active_listings", label: "Active listings", to: "/admin/listings" },
  { key: "sold_listings", label: "Sold listings", to: "/admin/listings?status=SOLD" },
  {
    key: "borrowed_listings",
    label: "Borrowed listings",
    to: "/admin/listings?status=BORROWED",
  },
  {
    key: "exchanged_listings",
    label: "Exchanged listings",
    to: "/admin/listings?status=EXCHANGED",
  },
  {
    key: "pending_reports",
    label: "Pending reports",
    to: "/admin/reports?status=PENDING",
  },
];

export function AdminOverviewPage() {
  const summaryQuery = useQuery({
    queryKey: ["admin-summary"],
    queryFn: fetchAdminSummary,
  });

  if (summaryQuery.isPending) {
    return <Loading label="Loading dashboard" />;
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <ErrorMessage
        message={getApiErrorMessage(
          summaryQuery.error,
          "Could not load dashboard summary.",
        )}
      />
    );
  }

  const summary = summaryQuery.data;

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.key}
            to={card.to}
            className="surface-card block p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {summary[card.key]}
            </p>
          </Link>
        ))}
      </div>
      <p className="text-sm text-slate-600">
        Use the sections above to manage users, listings, categories, and reports.
      </p>
    </section>
  );
}
