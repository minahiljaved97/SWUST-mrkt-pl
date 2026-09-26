import type { Listing } from "../types/marketplace";
import { ListingCard } from "./ListingCard";

type ListingGridProps = {
  listings: Listing[];
};

export function ListingGrid({ listings }: ListingGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
