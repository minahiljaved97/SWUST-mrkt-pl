import { apiClient } from "./client";
import type {
  Category,
  Listing,
  ListingFilters,
  Paginated,
  ReportReason,
} from "../types/marketplace";

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

export async function fetchListing(id: string): Promise<Listing> {
  const { data } = await apiClient.get<Listing>(`/listings/${id}/`);
  return data;
}

export async function createListing(payload: Record<string, unknown>): Promise<Listing> {
  const { data } = await apiClient.post<Listing>("/listings/", payload);
  return data;
}

export async function addFavorite(listingId: string): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>("/favorites/", {
    listing: listingId,
  });
  return data;
}

export async function removeFavorite(favoriteId: string): Promise<void> {
  await apiClient.delete(`/favorites/${favoriteId}/`);
}

export async function createReport(payload: {
  listing: string;
  reason: ReportReason;
  description?: string;
}): Promise<unknown> {
  const { data } = await apiClient.post("/reports/", payload);
  return data;
}
