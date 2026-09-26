import { useQuery } from "@tanstack/react-query";

import { fetchAdminUsers } from "../api/auth";
import { getApiErrorMessage } from "../api/client";
import { ErrorMessage, Loading } from "../components";

export function AdminUsersPage() {
  const query = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchAdminUsers,
  });

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Manage students</h1>
        <p className="mt-2 text-sm text-slate-600">
          Admin-only endpoint: list users from the API.
        </p>
      </div>
      {query.isPending ? <Loading label="Loading users" /> : null}
      {query.isError ? (
        <ErrorMessage message={getApiErrorMessage(query.error, "Unauthorized or failed.")} />
      ) : null}
      {query.data ? (
        <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
          {query.data.map((user) => (
            <li key={user.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>
                {user.first_name} {user.last_name} ({user.email})
              </span>
              <span className="text-slate-500">
                {user.role} · {user.is_active ? "active" : "inactive"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
