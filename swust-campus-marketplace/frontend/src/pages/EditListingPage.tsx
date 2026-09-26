import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

import {
  deleteListingImage,
  fetchCategories,
  fetchListing,
  setPrimaryListingImage,
  updateListing,
  uploadListingImage,
} from "../api/marketplace";
import { getApiErrorMessage } from "../api/client";
import { EmptyState, Loading } from "../components";
import { useAuth } from "../features/auth/AuthContext";
import { ListingForm } from "../features/listings/ListingForm";
import type {
  ListingFormValues,
  PendingImage,
} from "../features/listings/listingFormSchema";

export function EditListingPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const listingQuery = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListing(id),
    enabled: Boolean(id),
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  if (listingQuery.isPending || categoriesQuery.isPending) {
    return <Loading label="Loading listing" />;
  }

  if (listingQuery.isError || !listingQuery.data) {
    return (
      <EmptyState
        title="Listing not found"
        description="This listing is unavailable."
        action={
          <Link className="text-sm underline" to="/listings/mine">
            Back to my listings
          </Link>
        }
      />
    );
  }

  const listing = listingQuery.data;
  if (user && listing.seller.id !== user.id && user.role !== "ADMIN") {
    return <Navigate to={`/marketplace/${listing.id}`} replace />;
  }

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["listing", id] });
    await queryClient.invalidateQueries({ queryKey: ["listings"] });
  };

  const handleSubmit = async (
    values: ListingFormValues,
    pendingImages: PendingImage[],
  ) => {
    await updateListing(id, {
      title: values.title,
      description: values.description,
      category: values.category,
      price: values.price,
      condition: values.condition,
      transaction_type: values.transaction_type,
      location: values.location,
      preferred_exchange_item:
        values.transaction_type === "EXCHANGE"
          ? values.preferred_exchange_item || ""
          : "",
      exchange_description:
        values.transaction_type === "EXCHANGE"
          ? values.exchange_description || ""
          : "",
      status: values.status,
    });

    const ordered = [
      ...pendingImages.filter((image) => image.isPrimary),
      ...pendingImages.filter((image) => !image.isPrimary),
    ];
    for (const image of ordered) {
      await uploadListingImage(id, image.file, {
        isPrimary: image.isPrimary,
        altText: values.title,
      });
    }

    await refresh();
    navigate(`/marketplace/${id}`);
  };

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit listing</h1>
        <p className="mt-2 text-sm text-slate-600">
          Update details, status, and photos for your listing.
        </p>
      </div>
      {listingQuery.isFetching ? (
        <p className="text-sm text-slate-500">Refreshing…</p>
      ) : null}
      <ListingForm
        mode="edit"
        categories={categoriesQuery.data ?? []}
        initialListing={listing}
        existingImages={listing.images ?? []}
        submitLabel="Save changes"
        onSubmit={handleSubmit}
        onDeleteExistingImage={async (imageId) => {
          try {
            await deleteListingImage(id, imageId);
            await refresh();
          } catch (error) {
            throw new Error(getApiErrorMessage(error, "Could not delete image."));
          }
        }}
        onSetPrimaryExistingImage={async (imageId) => {
          await setPrimaryListingImage(id, imageId);
          await refresh();
        }}
      />
    </section>
  );
}
