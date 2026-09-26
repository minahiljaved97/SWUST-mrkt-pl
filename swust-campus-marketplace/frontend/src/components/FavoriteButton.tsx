import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { favoriteListing, unfavoriteListing } from "../api/marketplace";
import { getApiErrorMessage } from "../api/client";
import { useAuth } from "../features/auth/AuthContext";
import { canFavoriteListing, patchListingFavorite } from "../lib/favorites";
import type { Listing, Paginated } from "../types/marketplace";

type FavoriteButtonProps = {
  listing: Pick<Listing, "id" | "is_favorited" | "favorite_id" | "seller">;
  size?: "sm" | "md";
  className?: string;
  onError?: (message: string) => void;
};

export function FavoriteButton({
  listing,
  size = "md",
  className = "",
  onError,
}: FavoriteButtonProps) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isOwner = user?.id === listing.seller.id;
  const permission = canFavoriteListing({ isAuthenticated, isOwner });

  const mutation = useMutation({
    mutationFn: async () => {
      if (listing.is_favorited) {
        await unfavoriteListing(listing.id);
        return { favorited: false, favoriteId: null as string | null };
      }
      const created = await favoriteListing(listing.id);
      return { favorited: true, favoriteId: created.id };
    },
    onMutate: async () => {
      // Optimistic updates only for listing caches we already hold locally.
      await queryClient.cancelQueries({ queryKey: ["listing", listing.id] });
      await queryClient.cancelQueries({ queryKey: ["listings"] });
      await queryClient.cancelQueries({ queryKey: ["favorites"] });

      const previousDetail = queryClient.getQueryData<Listing>([
        "listing",
        listing.id,
      ]);
      const previousLists = queryClient.getQueriesData<Paginated<Listing>>({
        queryKey: ["listings"],
      });

      const nextFavorited = !listing.is_favorited;
      const optimisticId = nextFavorited ? "optimistic" : null;

      if (previousDetail) {
        queryClient.setQueryData(
          ["listing", listing.id],
          patchListingFavorite(previousDetail, nextFavorited, optimisticId),
        );
      }

      for (const [key, value] of previousLists) {
        if (!value?.results) {
          continue;
        }
        queryClient.setQueryData(key, {
          ...value,
          results: value.results.map((item) =>
            item.id === listing.id
              ? patchListingFavorite(item, nextFavorited, optimisticId)
              : item,
          ),
        });
      }

      return { previousDetail, previousLists };
    },
    onError: (error, _vars, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(["listing", listing.id], context.previousDetail);
      }
      if (context?.previousLists) {
        for (const [key, value] of context.previousLists) {
          queryClient.setQueryData(key, value);
        }
      }
      onError?.(getApiErrorMessage(error, "Could not update favorite."));
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["listing", listing.id] });
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      await queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  const iconClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-full border bg-white/95 p-2 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 ${
        listing.is_favorited
          ? "border-rose-300 text-rose-600"
          : "border-slate-300 text-slate-600"
      } ${className}`}
      aria-label={listing.is_favorited ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={listing.is_favorited}
      disabled={mutation.isPending || isOwner}
      title={
        isOwner
          ? "You cannot favorite your own listing"
          : listing.is_favorited
            ? "Remove favorite"
            : "Add favorite"
      }
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!permission.allowed) {
          if (permission.reason === "login_required") {
            navigate("/login", { state: { from: `/marketplace/${listing.id}` } });
          }
          return;
        }
        mutation.mutate();
      }}
    >
      <Heart
        className={iconClass}
        fill={listing.is_favorited ? "currentColor" : "none"}
        aria-hidden
      />
    </button>
  );
}
