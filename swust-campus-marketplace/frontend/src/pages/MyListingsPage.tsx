import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  deleteListing,
  fetchMyListings,
  updateListing,
} from "../api/marketplace";
import { getApiErrorMessage } from "../api/client";
import {
  Button,
  EmptyState,
  ErrorMessage,
  LoadingSkeleton,
  PageHeader,
  Pagination,
  useToast,
} from "../components";
import { formatDate, formatPrice } from "../lib/format";
import { resolveMediaUrl } from "../lib/media";
import type { ListingStatus } from "../types/marketplace";

const PAGE_SIZE = 12;

const STATUS_OPTIONS: ListingStatus[] = [
  "ACTIVE",
  "RESERVED",
  "SOLD",
  "BORROWED",
  "EXCHANGED",
  "CLOSED",
];

export function MyListingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const listingsQuery = useQuery({
    queryKey: ["listings", "mine", page],
    queryFn: () => fetchMyListings(page, PAGE_SIZE),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ListingStatus }) =>
      updateListing(id, { status }),
    onSuccess: async () => {
      pushToast("Status updated.", "success");
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["listings", "mine"] });
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, "Could not update status."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteListing(id),
    onSuccess: async () => {
      pushToast("Listing removed from the marketplace.", "success");
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["listings", "mine"] });
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, "Could not delete listing."));
    },
  });

  const listings = listingsQuery.data?.results ?? [];
  const total = listingsQuery.data?.count ?? 0;

  return (
    <section className="space-y-6">
      <PageHeader
        title="My listings"
        description="Manage your posts, update status, or remove closed items."
        actions={
          <Button onClick={() => navigate("/listings/new")}>Add listing</Button>
        }
      />

      {error ? <ErrorMessage message={error} /> : null}

      {listingsQuery.isPending ? <LoadingSkeleton count={3} variant="rows" /> : null}
      {listingsQuery.isError ? (
        <ErrorMessage
          message={getApiErrorMessage(
            listingsQuery.error,
            "Could not load your listings.",
          )}
        />
      ) : null}

      {!listingsQuery.isPending && listings.length === 0 ? (
        <EmptyState
          title="No listings yet"
          description="Create your first campus listing to get started."
          action={
            <Button onClick={() => navigate("/listings/new")}>Add listing</Button>
          }
        />
      ) : null}

      {listings.length > 0 ? (
        <ul className="space-y-3">
          {listings.map((listing) => {
            const image = resolveMediaUrl(listing.primary_image);
            return (
              <li
                key={listing.id}
                className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
              >
                <div className="h-24 w-full shrink-0 overflow-hidden rounded-md bg-slate-100 sm:w-32">
                  {image ? (
                    <img
                      src={image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <Link
                    to={`/marketplace/${listing.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {listing.title}
                  </Link>
                  <p className="text-sm text-slate-600">
                    {formatPrice(listing.price, listing.transaction_type)} ·{" "}
                    {listing.transaction_type} · {formatDate(listing.created_at)}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {listing.status}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:w-52">
                  <label className="text-xs font-medium text-slate-600">
                    Status
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                      value={listing.status === "REMOVED" ? "CLOSED" : listing.status}
                      disabled={
                        statusMutation.isPending || listing.status === "REMOVED"
                      }
                      onChange={(event) => {
                        statusMutation.mutate({
                          id: listing.id,
                          status: event.target.value as ListingStatus,
                        });
                      }}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex gap-2">
                    <Link
                      to={`/listings/${listing.id}/edit`}
                      className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                    >
                      Edit
                    </Link>
                    <Button
                      variant="ghost"
                      className="flex-1"
                      isLoading={deleteMutation.isPending}
                      onClick={() => {
                        const confirmed = window.confirm(
                          "Remove this listing from the marketplace?",
                        );
                        if (confirmed) {
                          deleteMutation.mutate(listing.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
      />
    </section>
  );
}
