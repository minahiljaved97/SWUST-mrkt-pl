export type TransactionType = "SELL" | "BORROW" | "EXCHANGE";
export type ListingCondition = "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR";
export type ListingStatus =
  | "ACTIVE"
  | "RESERVED"
  | "SOLD"
  | "BORROWED"
  | "EXCHANGED"
  | "CLOSED"
  | "REMOVED";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
};

export type SellerSummary = {
  id: string;
  first_name: string;
  last_name: string;
  campus_location: string;
};

export type ListingImage = {
  id: string;
  image: string;
  alt_text: string;
  is_primary: boolean;
  created_at: string;
};

export type Listing = {
  id: string;
  title: string;
  description?: string;
  price: string;
  condition: ListingCondition;
  transaction_type: TransactionType;
  status: ListingStatus;
  location: string;
  category: Category;
  seller: SellerSummary;
  primary_image: string | null;
  images?: ListingImage[];
  preferred_exchange_item?: string;
  exchange_description?: string;
  is_favorited: boolean;
  favorite_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ListingFilters = {
  search?: string;
  category?: string;
  condition?: ListingCondition | "";
  transaction_type?: TransactionType | "";
  price_min?: string;
  price_max?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
  status?: ListingStatus;
};

export type ReportReason =
  | "SPAM"
  | "FRAUD"
  | "INAPPROPRIATE"
  | "PROHIBITED"
  | "OTHER";
