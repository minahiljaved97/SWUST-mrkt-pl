import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  fetchAdminUser,
  fetchAdminUserListings,
  fetchAdminUsers,
  updateAdminUserStatus,
} from "../../api/admin";
import { getApiErrorMessage } from "../../api/client";
import {
  Button,
  EmptyState,
  ErrorMessage,
  Loading,
  Pagination,
} from "../../components";
import { formatDate, sellerName } from "../../lib/format";
import type { AdminUser } from "../../types/admin";

const PAGE_SIZE = 12;

export function AdminUsersSection() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const usersQuery = useQuery({
    queryKey: ["admin-users", query, page],
    queryFn: () =>
      fetchAdminUsers({ search: query || undefined, page, page_size: PAGE_SIZE }),
  });

  const detailQuery = useQuery({
    queryKey: ["admin-user", selectedId],
    queryFn: () => fetchAdminUser(selectedId!),
    enabled: Boolean(selectedId),
  });

  const listingsQuery = useQuery({
    queryKey: ["admin-user-listings", selectedId],
    queryFn: () => fetchAdminUserListings(selectedId!),
    enabled: Boolean(selectedId),
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      updateAdminUserStatus(userId, isActive),
    onSuccess: async () => {
      setActionError("");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-user", selectedId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-summary"] });
    },
    onError: (error) => {
      setActionError(getApiErrorMessage(error, "Could not update user."));
    },
  });

  const users = usersQuery.data?.results ?? [];
  const selected = detailQuery.data;

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-4">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setQuery(search.trim());
          }}
        >
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, student ID"
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <Button type="submit">Search</Button>
        </form>

        {usersQuery.isPending ? <Loading label="Loading users" /> : null}
        {usersQuery.isError ? (
          <ErrorMessage
            message={getApiErrorMessage(usersQuery.error, "Could not load users.")}
          />
        ) : null}
        {!usersQuery.isPending && users.length === 0 ? (
          <EmptyState title="No users found" description="Try another search." />
        ) : null}

        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {users.map((user: AdminUser) => (
            <li key={user.id}>
              <button
                type="button"
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                  selectedId === user.id ? "bg-slate-50" : ""
                }`}
                onClick={() => setSelectedId(user.id)}
              >
                <span>
                  <span className="font-medium text-slate-900">
                    {sellerName(user.first_name, user.last_name)}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {user.email} · {user.student_id || "No student ID"}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-slate-500">
                  {user.role} · {user.is_active ? "active" : "inactive"} ·{" "}
                  {user.listings_count} listings
                </span>
              </button>
            </li>
          ))}
        </ul>

        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={usersQuery.data?.count ?? 0}
          onPageChange={setPage}
        />
      </div>

      <aside className="rounded-lg border border-slate-200 bg-white p-4">
        {!selectedId ? (
          <p className="text-sm text-slate-500">Select a user to view their profile.</p>
        ) : detailQuery.isPending ? (
          <Loading label="Loading profile" />
        ) : detailQuery.isError || !selected ? (
          <ErrorMessage message="Could not load user profile." />
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">
                {sellerName(selected.first_name, selected.last_name)}
              </h2>
              <p className="text-sm text-slate-500">{selected.email}</p>
            </div>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div>
                <dt className="text-slate-500">Student ID</dt>
                <dd>{selected.student_id || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Campus</dt>
                <dd>{selected.campus_location || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Joined</dt>
                <dd>{formatDate(selected.date_joined)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Bio</dt>
                <dd>{selected.bio || "—"}</dd>
              </div>
            </dl>

            {actionError ? <ErrorMessage message={actionError} /> : null}

            <Button
              variant="secondary"
              isLoading={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate({
                  userId: selected.id,
                  isActive: !selected.is_active,
                })
              }
            >
              {selected.is_active ? "Deactivate user" : "Activate user"}
            </Button>

            <div>
              <h3 className="text-sm font-semibold">User listings</h3>
              {listingsQuery.isPending ? (
                <p className="mt-2 text-sm text-slate-500">Loading listings…</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {(listingsQuery.data?.results ?? []).map((listing) => (
                    <li
                      key={listing.id}
                      className="rounded border border-slate-100 px-3 py-2 text-sm"
                    >
                      <p className="font-medium">{listing.title}</p>
                      <p className="text-xs text-slate-500">
                        {listing.status} · {listing.transaction_type}
                      </p>
                    </li>
                  ))}
                  {(listingsQuery.data?.results ?? []).length === 0 ? (
                    <li className="text-sm text-slate-500">No listings.</li>
                  ) : null}
                </ul>
              )}
            </div>
          </div>
        )}
      </aside>
    </section>
  );
}
