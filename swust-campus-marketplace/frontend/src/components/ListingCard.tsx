import { Link } from "react-router-dom";

import {
  formatCondition,
  formatDate,
  formatPrice,
  sellerName,
} from "../lib/format";
import { resolveMediaUrl } from "../lib/media";
import type { Listing } from "../types/marketplace";
import { Badge } from "./Card";
import { FavoriteButton } from "./FavoriteButton";

type ListingCardProps = {
  listing: Listing;
  showFavorite?: boolean;
  unavailable?: boolean;
};

export function ListingCard({
  listing,
  showFavorite = true,
  unavailable = false,
}: ListingCardProps) {
  const imageUrl = resolveMediaUrl(listing.primary_image);
  const content = (
    <>
      <div className="relative aspect-[4/3] bg-slate-100">
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
        {showFavorite && !unavailable ? (
          <div className="absolute right-2 top-2 z-10">
            <FavoriteButton listing={listing} size="sm" />
          </div>
        ) : null}
        {unavailable ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
            <Badge tone="danger">Removed</Badge>
          </div>
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 sm:text-[0.95rem]">
            {listing.title}
          </h3>
          <span className="shrink-0 text-sm font-semibold text-brand-800">
            {formatPrice(listing.price, listing.transaction_type)}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="brand">{listing.transaction_type}</Badge>
          <Badge>{formatCondition(listing.condition)}</Badge>
        </div>
        <p className="text-sm text-slate-600">{listing.category.name}</p>
        <p className="text-sm text-slate-500">
          {sellerName(listing.seller.first_name, listing.seller.last_name)}
          {listing.seller.campus_location
            ? ` · ${listing.seller.campus_location}`
            : ""}
        </p>
        <p className="text-xs text-slate-400">{formatDate(listing.created_at)}</p>
      </div>
    </>
  );

  return (
    <article className="group surface-card overflow-hidden transition hover:border-brand-200 hover:shadow-md">
      {unavailable ? (
        <div className="block opacity-80">{content}</div>
      ) : (
        <Link
          to={`/marketplace/${listing.id}`}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
        >
          {content}
        </Link>
      )}
    </article>
  );
}
