import type { Listing, ListingStatus, Paginated, TransactionType } from "./marketplace";

export type AdminDashboardSummary = {
  total_students: number;
  active_listings: number;
  sold_listings: number;
  borrowed_listings: number;
  exchanged_listings: number;
  pending_reports: number;
};

export type ChartPoint = {
  label: string;
  count: number;
};

export type AdminDashboardStatistics = {
  listings_by_category: ChartPoint[];
  listings_by_transaction_type: ChartPoint[];
  listing_status_distribution: ChartPoint[];
  listings_created_over_time: ChartPoint[];
};

export type AdminUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "STUDENT" | "ADMIN";
  is_active: boolean;
  date_joined: string;
  student_id: string;
  campus_location: string;
  listings_count: number;
  bio?: string;
  updated_at?: string;
};

export type AdminListing = Listing & {
  removed_reason?: string;
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  listings_count: number;
  created_at: string;
  updated_at: string;
};

export type AdminUsersPage = Paginated<AdminUser>;
export type AdminListingsPage = Paginated<AdminListing>;
export type AdminCategoriesPage = Paginated<AdminCategory>;

export type AdminListingFilters = {
  search?: string;
  status?: ListingStatus | "";
  transaction_type?: TransactionType | "";
  page?: number;
  page_size?: number;
};
