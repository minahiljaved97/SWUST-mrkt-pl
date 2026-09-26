import { apiClient } from "./client";
import type {
  AdminCategory,
  AdminCategoriesPage,
  AdminDashboardStatistics,
  AdminDashboardSummary,
  AdminListing,
  AdminListingFilters,
  AdminListingsPage,
  AdminUser,
  AdminUsersPage,
} from "../types/admin";

export async function fetchAdminSummary(): Promise<AdminDashboardSummary> {
  const { data } = await apiClient.get<AdminDashboardSummary>(
    "/admin/dashboard/summary/",
  );
  return data;
}

export async function fetchAdminStatistics(): Promise<AdminDashboardStatistics> {
  const { data } = await apiClient.get<AdminDashboardStatistics>(
    "/admin/dashboard/statistics/",
  );
  return data;
}

export async function fetchAdminUsers(params?: {
  search?: string;
  role?: string;
  is_active?: boolean | "";
  page?: number;
  page_size?: number;
}): Promise<AdminUsersPage> {
  const { data } = await apiClient.get<AdminUsersPage>("/admin/users/", {
    params,
  });
  return data;
}

export async function fetchAdminUser(userId: string): Promise<AdminUser> {
  const { data } = await apiClient.get<AdminUser>(`/admin/users/${userId}/`);
  return data;
}

export async function updateAdminUserStatus(
  userId: string,
  isActive: boolean,
): Promise<AdminUser> {
  const { data } = await apiClient.patch<AdminUser>(`/admin/users/${userId}/`, {
    is_active: isActive,
  });
  return data;
}

export async function fetchAdminUserListings(
  userId: string,
  page = 1,
  pageSize = 12,
): Promise<AdminListingsPage> {
  const { data } = await apiClient.get<AdminListingsPage>(
    `/admin/users/${userId}/listings/`,
    { params: { page, page_size: pageSize } },
  );
  return data;
}

export async function fetchAdminListings(
  filters: AdminListingFilters = {},
): Promise<AdminListingsPage> {
  const { data } = await apiClient.get<AdminListingsPage>("/admin/listings/", {
    params: filters,
  });
  return data;
}

export async function updateAdminListing(
  listingId: string,
  payload: { remove?: boolean; restore?: boolean; status?: string },
): Promise<AdminListing> {
  const { data } = await apiClient.patch<AdminListing>(
    `/admin/listings/${listingId}/`,
    payload,
  );
  return data;
}

export async function fetchAdminCategories(params?: {
  search?: string;
  is_active?: boolean | "";
  page?: number;
  page_size?: number;
}): Promise<AdminCategoriesPage> {
  const { data } = await apiClient.get<AdminCategoriesPage>(
    "/admin/categories/",
    { params },
  );
  return data;
}

export async function createAdminCategory(payload: {
  name: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}): Promise<AdminCategory> {
  const { data } = await apiClient.post<AdminCategory>(
    "/admin/categories/",
    payload,
  );
  return data;
}

export async function updateAdminCategory(
  categoryId: string,
  payload: {
    name?: string;
    description?: string;
    sort_order?: number;
    is_active?: boolean;
  },
): Promise<AdminCategory> {
  const { data } = await apiClient.patch<AdminCategory>(
    `/admin/categories/${categoryId}/`,
    payload,
  );
  return data;
}
