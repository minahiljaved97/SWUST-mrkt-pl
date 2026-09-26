import { Link } from "react-router-dom";

import {
  formatCondition,
  formatDate,
  formatPrice,
  sellerName,
} from "../lib/format";
import { resolveMediaUrl } from "../lib/media";
import type { Listing } from "../types/marketplace";

type ListingCardProps = {
  listing: Listing;
};

export function ListingCard({ listing }: ListingCardProps) {
  const imageUrl = resolveMediaUrl(listing.primary_image);

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-slate-400">
      <Link to={`/marketplace/${listing.id}`} className="block">
        <div className="aspect-[4/3] bg-slate-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={listing.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              No image
            </div>
          )}
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 font-medium text-slate-900">{listing.title}</h3>
            <span className="shrink-0 text-sm font-semibold text-slate-900">
              {formatPrice(listing.price, listing.transaction_type)}
            </span>
          </div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {listing.transaction_type} · {formatCondition(listing.condition)}
          </p>
          <p className="text-sm text-slate-600">{listing.category.name}</p>
          <p className="text-sm text-slate-500">
            {sellerName(listing.seller.first_name, listing.seller.last_name)}
            {listing.seller.campus_location
              ? ` · ${listing.seller.campus_location}`
              : ""}
          </p>
          <p className="text-xs text-slate-400">{formatDate(listing.created_at)}</p>
        </div>
      </Link>
    </article>
  );
}
