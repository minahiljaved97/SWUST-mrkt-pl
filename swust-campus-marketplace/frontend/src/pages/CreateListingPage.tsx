import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import {
  createListing,
  fetchCategories,
  uploadListingImage,
} from "../api/marketplace";
import { Card, Loading, PageHeader, useToast } from "../components";
import { ListingForm } from "../features/listings/ListingForm";
import type {
  ListingFormValues,
  PendingImage,
} from "../features/listings/listingFormSchema";

export function CreateListingPage() {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  if (categoriesQuery.isPending) {
    return <Loading label="Loading form" />;
  }

  const handleSubmit = async (
    values: ListingFormValues,
    pendingImages: PendingImage[],
  ) => {
    const created = await createListing({
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
      status: "ACTIVE",
    });

    const ordered = [
      ...pendingImages.filter((image) => image.isPrimary),
      ...pendingImages.filter((image) => !image.isPrimary),
    ];
    for (const [index, image] of ordered.entries()) {
      await uploadListingImage(created.id, image.file, {
        isPrimary: index === 0 || image.isPrimary,
        altText: values.title,
      });
    }

    pushToast("Listing published.", "success");
    navigate(`/marketplace/${created.id}`);
  };

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Add listing"
        description="Publish a sell, borrow, or exchange listing with photos."
      />
      <Card>
        <ListingForm
          mode="create"
          categories={categoriesQuery.data ?? []}
          onSubmit={handleSubmit}
          submitLabel="Publish listing"
        />
      </Card>
    </section>
  );
}
