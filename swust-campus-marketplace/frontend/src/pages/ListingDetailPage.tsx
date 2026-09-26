import { useMutation, useQuery } from "@tanstack/react-query";
import { Flag, MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { fetchListing } from "../api/marketplace";
import { startConversation } from "../api/messaging";
import { getApiErrorMessage } from "../api/client";
import {
  Button,
  EmptyState,
  ErrorMessage,
  FavoriteButton,
  LoadingSkeleton,
  ReportModal,
  useToast,
} from "../components";
import { useAuth } from "../features/auth/AuthContext";
import {
  formatCondition,
  formatDate,
  formatPrice,
  sellerName,
} from "../lib/format";
import { resolveMediaUrl } from "../lib/media";
import type { ReportTarget } from "../types/reports";

export function ListingDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { user } = useAuth();
  const [activeImage, setActiveImage] = useState(0);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [actionError, setActionError] = useState("");

  const listingQuery = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListing(id),
    enabled: Boolean(id),
  });

  const listing = listingQuery.data;
  const images = useMemo(() => {
    if (!listing) {
      return [] as { url: string; alt: string }[];
    }
    if (listing.images && listing.images.length > 0) {
      return listing.images
        .map((image) => {
          const url = resolveMediaUrl(image.image);
          return url
            ? { url, alt: image.alt_text || listing.title }
            : null;
        })
        .filter((image): image is { url: string; alt: string } => Boolean(image));
    }
    const primary = resolveMediaUrl(listing.primary_image);
    return primary ? [{ url: primary, alt: listing.title }] : [];
  }, [listing]);

  const contactMutation = useMutation({
    mutationFn: () => startConversation({ listing: id }),
    onSuccess: (conversation) => {
      setActionError("");
      navigate(`/messages/${conversation.id}`);
    },
    onError: (error) => {
      setActionError(
        getApiErrorMessage(error, "Could not start a conversation."),
      );
    },
  });

  if (listingQuery.isPending) {
    return <LoadingSkeleton variant="detail" />;
  }

  if (listingQuery.isError || !listing) {
    return (
      <EmptyState
        title="Listing not found"
        description="This listing may have been removed or is unavailable."
        action={
          <Link className="text-sm underline" to="/marketplace">
            Back to marketplace
          </Link>
        }
      />
    );
  }

  const isOwner = user?.id === listing.seller.id;
  const sellerLabel = sellerName(
    listing.seller.first_name,
    listing.seller.last_name,
  );

  return (
    <article className="space-y-6">
      <Link className="text-sm text-slate-600 underline" to="/marketplace">
        Back to marketplace
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section aria-label="Listing images" className="space-y-3">
          <div className="aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {images[activeImage]?.url ? (
              <img
                src={images[activeImage].url}
                alt={images[activeImage].alt}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No image
              </div>
            )}
          </div>
          {images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={`${image.url}-${index}`}
                  type="button"
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded border ${
                    index === activeImage
                      ? "border-slate-900"
                      : "border-slate-200"
                  }`}
                  onClick={() => setActiveImage(index)}
                >
                  <img
                    src={image.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {listing.title}
            </h1>
            <p className="mt-2 text-xl font-medium text-slate-900">
              {formatPrice(listing.price, listing.transaction_type)}
            </p>
            <p className="mt-2 text-sm uppercase tracking-wide text-slate-500">
              {listing.transaction_type} · {formatCondition(listing.condition)} ·{" "}
              {listing.status}
            </p>
          </div>

          <div className="space-y-1 text-sm text-slate-600">
            <p>
              Seller:{" "}
              <span className="font-medium text-slate-900">{sellerLabel}</span>
            </p>
            {listing.seller.campus_location ? (
              <p>Campus: {listing.seller.campus_location}</p>
            ) : null}
            <p>Category: {listing.category.name}</p>
            <p>Location: {listing.location || "Not specified"}</p>
            <p>Posted {formatDate(listing.created_at)}</p>
          </div>

          {listing.transaction_type === "EXCHANGE" ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">Looking to exchange for</p>
              <p className="mt-1 text-slate-700">
                {listing.preferred_exchange_item || "Not specified"}
              </p>
              {listing.exchange_description ? (
                <p className="mt-2 text-slate-600">{listing.exchange_description}</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {isOwner ? (
              <Link
                to={`/listings/${listing.id}/edit`}
                className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Edit listing
              </Link>
            ) : (
              <FavoriteButton
                listing={listing}
                onError={(message) => setActionError(message)}
              />
            )}
            <Button
              variant="secondary"
              disabled={isOwner || contactMutation.isPending}
              title={
                isOwner
                  ? "You cannot message yourself"
                  : "Start or open a conversation with the seller"
              }
              onClick={() => contactMutation.mutate()}
            >
              <span className="inline-flex items-center gap-2">
                <MessageCircle className="h-4 w-4" aria-hidden />
                {contactMutation.isPending ? "Opening…" : "Contact seller"}
              </span>
            </Button>
            <Button
              variant="ghost"
              disabled={isOwner}
              onClick={() =>
                setReportTarget({
                  type: "listing",
                  listingId: listing.id,
                  label: listing.title,
                })
              }
            >
              <span className="inline-flex items-center gap-2">
                <Flag className="h-4 w-4" aria-hidden />
                Report listing
              </span>
            </Button>
            <Button
              variant="ghost"
              disabled={isOwner}
              onClick={() =>
                setReportTarget({
                  type: "user",
                  userId: listing.seller.id,
                  label: sellerLabel,
                })
              }
            >
              Report seller
            </Button>
          </div>

          {actionError ? <ErrorMessage message={actionError} /> : null}
        </section>
      </div>

      <section className="surface-card max-w-3xl space-y-2 p-5 sm:p-6">
        <h2 className="section-title">Description</h2>
        <p className="whitespace-pre-wrap text-slate-700">
          {listing.description || "No description provided."}
        </p>
      </section>

      <ReportModal
        open={Boolean(reportTarget)}
        target={reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmitted={(message: string) => {
          pushToast(message, "success");
          setActionError("");
        }}
      />
    </article>
  );
}
