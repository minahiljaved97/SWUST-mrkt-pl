export type Favorite = {
  id: string;
  listing: string;
  listing_detail: import("./marketplace").Listing;
  is_available: boolean;
  created_at: string;
};
