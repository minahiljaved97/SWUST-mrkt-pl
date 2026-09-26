import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { fetchAdminListings, updateAdminListing } from "../../api/admin";
import { getApiErrorMessage } from "../../api/client";
import {
  Button,
  EmptyState,
  ErrorMessage,
  Loading,
  Pagination,
} from "../../components";
import { formatDate, formatPrice } from "../../lib/format";
import type { ListingStatus, TransactionType } from "../../types/marketplace";

const PAGE_SIZE = 12;
const STATUSES: Array<ListingStatus | ""> = [
  "",
  "ACTIVE",
  "RESERVED",
  "SOLD",
  "BORROWED",
  "EXCHANGED",
  "CLOSED",
  "REMOVED",
];
const TYPES: Array<TransactionType | ""> = ["", "SELL", "BORROW", "EXCHANGE"];

export function AdminListingsSection() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState("");

  const status = (searchParams.get("status") ?? "") as ListingStatus | "";
  const transactionType = (searchParams.get("transaction_type") ??
    "") as TransactionType | "";

  const filters = useMemo(
    () => ({
      search: searchParams.get("search") || undefined,
      status: status || undefined,
      transaction_type: transactionType || undefined,
      page,
      page_size: PAGE_SIZE,
    }),
    [searchParams, status, transactionType, page],
  );

  const listingsQuery = useQuery({
    queryKey: ["admin-listings", filters],
    queryFn: () => fetchAdminListings(filters),
  });

  const mutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { remove?: boolean; restore?: boolean };
    }) => updateAdminListing(id, payload),
    onSuccess: async () => {
      setActionError("");
      await queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-summary"] });
    },
    onError: (error) => {
      setActionError(getApiErrorMessage(error, "Could not update listing."));
    },
  });

  const listings = listingsQuery.data?.results ?? [];

  function applyFilters(next: {
    search?: string;
    status?: string;
    transaction_type?: string;
  }) {
    const params = new URLSearchParams();
    if (next.search) params.set("search", next.search);
    if (next.status) params.set("status", next.status);
    if (next.transaction_type) {
      params.set("transaction_type", next.transaction_type);
    }
    setPage(1);
    setSearchParams(params);
  }

  return (
    <section className="space-y-4">
      <form
        className="grid grid-cols-1 gap-2 md:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters({
            search: search.trim(),
            status,
            transaction_type: transactionType,
          });
        }}
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search listings"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
        />
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={status}
          onChange={(event) =>
            applyFilters({
              search: search.trim(),
              status: event.target.value,
              transaction_type: transactionType,
            })
          }
        >
          {STATUSES.map((value) => (
            <option key={value || "all"} value={value}>
              {value || "All statuses"}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={transactionType}
          onChange={(event) =>
            applyFilters({
              search: search.trim(),
              status,
              transaction_type: event.target.value,
            })
          }
        >
          {TYPES.map((value) => (
            <option key={value || "all-types"} value={value}>
              {value || "All types"}
            </option>
          ))}
        </select>
      </form>

      {actionError ? <ErrorMessage message={actionError} /> : null}
      {listingsQuery.isPending ? <Loading label="Loading listings" /> : null}
      {listingsQuery.isError ? (
        <ErrorMessage
          message={getApiErrorMessage(
            listingsQuery.error,
            "Could not load listings.",
          )}
        />
      ) : null}
      {!listingsQuery.isPending && listings.length === 0 ? (
        <EmptyState
          title="No listings"
          description="No listings match the current filters."
        />
      ) : null}

      <ul className="space-y-3">
        {listings.map((listing) => (
          <li
            key={listing.id}
            className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <Link
                to={`/marketplace/${listing.id}`}
                className="font-medium text-slate-900 underline-offset-2 hover:underline"
              >
                {listing.title}
              </Link>
              <p className="mt-1 text-sm text-slate-500">
                {listing.status} · {listing.transaction_type} ·{" "}
                {formatPrice(listing.price, listing.transaction_type)} ·{" "}
                {listing.category.name} · {formatDate(listing.created_at)}
              </p>
              {listing.removed_reason ? (
                <p className="mt-1 text-xs text-rose-700">
                  {listing.removed_reason}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {listing.status === "REMOVED" ? (
                <Button
                  variant="secondary"
                  isLoading={mutation.isPending}
                  onClick={() =>
                    mutation.mutate({ id: listing.id, payload: { restore: true } })
                  }
                >
                  Restore
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  isLoading={mutation.isPending}
                  onClick={() =>
                    mutation.mutate({ id: listing.id, payload: { remove: true } })
                  }
                >
                  Remove
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={listingsQuery.data?.count ?? 0}
        onPageChange={setPage}
      />
    </section>
  );
}
