import type { Listing } from "../types/marketplace";

export function patchListingFavorite(
  listing: Listing,
  favorited: boolean,
  favoriteId: string | null,
): Listing {
  return {
    ...listing,
    is_favorited: favorited,
    favorite_id: favoriteId,
  };
}

export function canFavoriteListing(options: {
  isAuthenticated: boolean;
  isOwner: boolean;
}): { allowed: boolean; reason?: string } {
  if (!options.isAuthenticated) {
    return { allowed: false, reason: "login_required" };
  }
  if (options.isOwner) {
    return { allowed: false, reason: "own_listing" };
  }
  return { allowed: true };
}
