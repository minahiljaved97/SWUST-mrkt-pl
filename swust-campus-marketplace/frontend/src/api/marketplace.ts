import { apiClient } from "./client";
import type {
  Category,
  Listing,
  ListingFilters,
  ListingImage,
  ListingStatus,
  Paginated,
} from "../types/marketplace";

export type ListingWritePayload = {
  title: string;
  description: string;
  category: string;
  price: string | number;
  condition: string;
  transaction_type: string;
  location: string;
  preferred_exchange_item?: string;
  exchange_description?: string;
  status?: ListingStatus;
};

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<Paginated<Category> | Category[]>(
    "/categories/",
  );
  return Array.isArray(data) ? data : data.results;
}

export async function fetchListings(
  filters: ListingFilters = {},
): Promise<Paginated<Listing>> {
  const { data } = await apiClient.get<Paginated<Listing>>("/listings/", {
    params: Object.fromEntries(
      Object.entries(filters).filter(
        ([, value]) => value !== undefined && value !== "" && value !== null,
      ),
    ),
  });
  return data;
}

export async function fetchMyListings(
  page = 1,
  pageSize = 12,
): Promise<Paginated<Listing>> {
  const { data } = await apiClient.get<Paginated<Listing>>("/listings/mine/", {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function fetchListing(id: string): Promise<Listing> {
  const { data } = await apiClient.get<Listing>(`/listings/${id}/`);
  return data;
}

export async function createListing(payload: ListingWritePayload): Promise<Listing> {
  const { data } = await apiClient.post<Listing>("/listings/", payload);
  return data;
}

export async function updateListing(
  id: string,
  payload: Partial<ListingWritePayload>,
): Promise<Listing> {
  const { data } = await apiClient.patch<Listing>(`/listings/${id}/`, payload);
  return data;
}

export async function deleteListing(id: string): Promise<void> {
  await apiClient.delete(`/listings/${id}/`);
}

export async function uploadListingImage(
  listingId: string,
  file: File,
  options: { isPrimary?: boolean; altText?: string } = {},
): Promise<ListingImage> {
  const formData = new FormData();
  formData.append("image", file);
  if (options.isPrimary) {
    formData.append("is_primary", "true");
  }
  if (options.altText) {
    formData.append("alt_text", options.altText);
  }
  const { data } = await apiClient.post<ListingImage>(
    `/listings/${listingId}/images/`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return data;
}

export async function deleteListingImage(
  listingId: string,
  imageId: string,
): Promise<void> {
  await apiClient.delete(`/listings/${listingId}/images/${imageId}/`);
}

export async function setPrimaryListingImage(
  listingId: string,
  imageId: string,
): Promise<ListingImage> {
  const { data } = await apiClient.post<ListingImage>(
    `/listings/${listingId}/images/${imageId}/primary/`,
  );
  return data;
}

export async function favoriteListing(listingId: string): Promise<{
  id: string;
  listing: string;
  is_available?: boolean;
}> {
  const { data } = await apiClient.post(`/listings/${listingId}/favorite/`);
  return data;
}

export async function unfavoriteListing(listingId: string): Promise<void> {
  await apiClient.delete(`/listings/${listingId}/favorite/`);
}

/** @deprecated Prefer favoriteListing / unfavoriteListing */
export async function addFavorite(listingId: string) {
  return favoriteListing(listingId);
}

/** @deprecated Prefer unfavoriteListing(listingId) */
export async function removeFavorite(_favoriteId: string): Promise<void> {
  throw new Error("Use unfavoriteListing(listingId) instead.");
}

export async function fetchFavorites(
  page = 1,
  pageSize = 12,
): Promise<Paginated<import("../types/favorites").Favorite>> {
  const { data } = await apiClient.get("/favorites/", {
    params: { page, page_size: pageSize },
  });
  return data;
}
