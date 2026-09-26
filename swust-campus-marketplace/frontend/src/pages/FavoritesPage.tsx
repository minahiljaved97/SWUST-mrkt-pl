import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchFavorites, unfavoriteListing } from "../api/marketplace";
import { getApiErrorMessage } from "../api/client";
import {
  Button,
  EmptyState,
  ErrorMessage,
  ListingCard,
  LoadingSkeleton,
  PageHeader,
  Pagination,
  useToast,
} from "../components";

const PAGE_SIZE = 12;

export function FavoritesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const favoritesQuery = useQuery({
    queryKey: ["favorites", page],
    queryFn: () => fetchFavorites(page, PAGE_SIZE),
  });

  const removeMutation = useMutation({
    mutationFn: (listingId: string) => unfavoriteListing(listingId),
    onSuccess: async () => {
      setError("");
      pushToast("Removed from favorites.", "success");
      await queryClient.invalidateQueries({ queryKey: ["favorites"] });
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, "Could not remove favorite."));
    },
  });

  const favorites = favoritesQuery.data?.results ?? [];
  const total = favoritesQuery.data?.count ?? 0;

  return (
    <section className="space-y-6">
      <PageHeader
        title="Favorites"
        description="Listings you saved for later."
      />

      {error ? <ErrorMessage message={error} /> : null}
      {favoritesQuery.isPending ? <LoadingSkeleton /> : null}
      {favoritesQuery.isError ? (
        <ErrorMessage
          message={getApiErrorMessage(
            favoritesQuery.error,
            "Could not load favorites. Sign in as a student to continue.",
          )}
        />
      ) : null}

      {!favoritesQuery.isPending && favorites.length === 0 ? (
        <EmptyState
          title="No favorites yet"
          description="Tap the heart on a listing card to save it here."
            action={
              <Button variant="secondary" onClick={() => navigate("/marketplace")}>
                Browse marketplace
              </Button>
            }
        />
      ) : null}

      {favorites.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((favorite) => (
            <li key={favorite.id} className="space-y-2">
              <ListingCard
                listing={{
                  ...favorite.listing_detail,
                  is_favorited: true,
                  favorite_id: favorite.id,
                }}
                unavailable={!favorite.is_available}
              />
              <button
                type="button"
                className="text-sm font-medium text-brand-700 hover:underline disabled:opacity-50"
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate(favorite.listing)}
              >
                Remove favorite
              </button>
            </li>
          ))}
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
