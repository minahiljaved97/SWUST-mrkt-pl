import { zodResolver } from "@hookform/resolvers/zod";
import { Star, Trash2, Upload } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";

import { getApiErrorMessage, getFieldErrors } from "../../api/client";
import { Button, ErrorMessage, Input } from "../../components";
import { resolveMediaUrl } from "../../lib/media";
import type { Category, Listing, ListingImage } from "../../types/marketplace";
import {
  listingFormSchema,
  type ListingFormValues,
  type PendingImage,
} from "./listingFormSchema";

type ListingFormProps = {
  mode: "create" | "edit";
  categories: Category[];
  initialListing?: Listing;
  existingImages?: ListingImage[];
  onSubmit: (values: ListingFormValues, pendingImages: PendingImage[]) => Promise<void>;
  onDeleteExistingImage?: (imageId: string) => Promise<void>;
  onSetPrimaryExistingImage?: (imageId: string) => Promise<void>;
  submitLabel: string;
};

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function ListingForm({
  mode,
  categories,
  initialListing,
  existingImages = [],
  onSubmit,
  onDeleteExistingImage,
  onSetPrimaryExistingImage,
  submitLabel,
}: ListingFormProps) {
  const fileInputId = useId();
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [imageBusy, setImageBusy] = useState(false);

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      title: initialListing?.title ?? "",
      description: initialListing?.description ?? "",
      category: initialListing?.category.id ?? "",
      price: initialListing?.price ?? "0",
      condition: initialListing?.condition ?? "GOOD",
      transaction_type: initialListing?.transaction_type ?? "SELL",
      location: initialListing?.location ?? "",
      preferred_exchange_item: initialListing?.preferred_exchange_item ?? "",
      exchange_description: initialListing?.exchange_description ?? "",
      status: initialListing?.status === "REMOVED" ? "CLOSED" : initialListing?.status ?? "ACTIVE",
    },
  });

  const transactionType = form.watch("transaction_type");

  useEffect(() => {
    return () => {
      for (const image of pendingImages) {
        URL.revokeObjectURL(image.previewUrl);
      }
    };
  }, [pendingImages]);

  const totalImages = existingImages.length + pendingImages.length;

  const addFiles = (files: FileList | null) => {
    if (!files?.length) {
      return;
    }
    const typed = Array.from(files).filter((file) =>
      ALLOWED_IMAGE_TYPES.includes(file.type),
    );
    const incoming = typed.filter((file) => file.size <= MAX_IMAGE_BYTES);
    if (typed.length !== incoming.length) {
      setFormError("Each image must be 5 MB or smaller (JPEG, PNG, WebP, GIF).");
      return;
    }
    if (typed.length === 0) {
      setFormError("Please choose JPEG, PNG, WebP, or GIF images.");
      return;
    }
    const available = MAX_IMAGES - totalImages;
    if (available <= 0) {
      setFormError(`You can upload at most ${MAX_IMAGES} images.`);
      return;
    }
    const next = incoming.slice(0, available).map((file, index) => ({
      key: `${file.name}-${file.size}-${file.lastModified}-${index}`,
      file,
      previewUrl: URL.createObjectURL(file),
      isPrimary: existingImages.length === 0 && pendingImages.length === 0 && index === 0,
    }));
    setPendingImages((prev) => {
      const merged = [...prev, ...next];
      if (!merged.some((item) => item.isPrimary) && existingImages.every((img) => !img.is_primary)) {
        if (merged[0]) {
          merged[0] = { ...merged[0], isPrimary: true };
        }
      }
      return merged;
    });
    setFormError("");
  };

  const removePending = (key: string) => {
    setPendingImages((prev) => {
      const target = prev.find((item) => item.key === key);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const next = prev.filter((item) => item.key !== key);
      if (target?.isPrimary && next[0]) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });
  };

  const markPendingPrimary = (key: string) => {
    setPendingImages((prev) =>
      prev.map((item) => ({ ...item, isPrimary: item.key === key })),
    );
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    setFormError("");
    setSuccessMessage("");
    try {
      await onSubmit(values, pendingImages);
      setSuccessMessage(
        mode === "create" ? "Listing published successfully." : "Listing updated successfully.",
      );
      if (mode === "create") {
        for (const image of pendingImages) {
          URL.revokeObjectURL(image.previewUrl);
        }
        setPendingImages([]);
      }
    } catch (error) {
      const fields = getFieldErrors(error);
      for (const [key, message] of Object.entries(fields)) {
        form.setError(key as keyof ListingFormValues, { message });
      }
      setFormError(getApiErrorMessage(error, "Could not save listing."));
    }
  });

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {formError ? <ErrorMessage message={formError} /> : null}
      {successMessage ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
          {successMessage}
        </p>
      ) : null}

      <Input
        label="Title"
        error={form.formState.errors.title?.message}
        {...form.register("title")}
      />

      <label className="flex w-full flex-col gap-1 text-sm text-slate-700">
        <span className="font-medium">Description</span>
        <textarea
          className="field-control min-h-28"
          {...form.register("description")}
        />
        {form.formState.errors.description?.message ? (
          <span className="text-xs text-red-600">
            {form.formState.errors.description.message}
          </span>
        ) : null}
      </label>

      <label className="block text-sm text-slate-700">
        <span className="mb-1 block font-medium">Category</span>
        <select
          className="field-control"
          {...form.register("category")}
        >
          <option value="">Select category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {form.formState.errors.category?.message ? (
          <span className="text-xs text-red-600">{form.formState.errors.category.message}</span>
        ) : null}
      </label>

      <label className="block text-sm text-slate-700">
        <span className="mb-1 block font-medium">Transaction type</span>
        <select
          className="field-control"
          {...form.register("transaction_type")}
        >
          <option value="SELL">Sell</option>
          <option value="BORROW">Borrow</option>
          <option value="EXCHANGE">Exchange</option>
        </select>
      </label>

      <label className="block text-sm text-slate-700">
        <span className="mb-1 block font-medium">Condition</span>
        <select
          className="field-control"
          {...form.register("condition")}
        >
          <option value="NEW">New</option>
          <option value="LIKE_NEW">Like new</option>
          <option value="GOOD">Good</option>
          <option value="FAIR">Fair</option>
          <option value="POOR">Poor</option>
        </select>
      </label>

      {transactionType === "SELL" || transactionType === "BORROW" ? (
        <Input
          label={
            transactionType === "SELL"
              ? "Price (CNY, required)"
              : "Price / deposit (0 allowed)"
          }
          type="number"
          step="0.01"
          min="0"
          error={form.formState.errors.price?.message}
          {...form.register("price")}
        />
      ) : (
        <Input
          label="Estimated value (optional, 0 allowed)"
          type="number"
          step="0.01"
          min="0"
          error={form.formState.errors.price?.message}
          {...form.register("price")}
        />
      )}

      <Input
        label="Campus location"
        error={form.formState.errors.location?.message}
        {...form.register("location")}
      />

      {transactionType === "EXCHANGE" ? (
        <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
          <Input
            label="Preferred exchange item"
            error={form.formState.errors.preferred_exchange_item?.message}
            {...form.register("preferred_exchange_item")}
          />
          <label className="flex w-full flex-col gap-1 text-sm text-slate-700">
            <span className="font-medium">Exchange description</span>
            <textarea
              className="field-control min-h-20"
              {...form.register("exchange_description")}
            />
          </label>
        </div>
      ) : null}

      {mode === "edit" ? (
        <label className="block text-sm text-slate-700">
          <span className="mb-1 block font-medium">Status</span>
          <select
            className="field-control"
            {...form.register("status")}
          >
            <option value="ACTIVE">Active</option>
            <option value="RESERVED">Reserved</option>
            <option value="SOLD">Sold</option>
            <option value="BORROWED">Borrowed</option>
            <option value="EXCHANGED">Exchanged</option>
            <option value="CLOSED">Closed</option>
          </select>
        </label>
      ) : null}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-900">Images</legend>
        <p className="text-xs text-slate-500">
          JPEG, PNG, WebP, or GIF. Up to {MAX_IMAGES} images, 5 MB each. Mark one as primary.
        </p>
        <label
          htmlFor={fileInputId}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-600 hover:border-slate-500"
        >
          <Upload className="h-4 w-4" aria-hidden />
          Add images ({totalImages}/{MAX_IMAGES})
        </label>
        <input
          id={fileInputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="sr-only"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />

        {existingImages.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {existingImages.map((image) => {
              const url = resolveMediaUrl(image.image);
              return (
                <li
                  key={image.id}
                  className="overflow-hidden rounded-md border border-slate-200 bg-white"
                >
                  <div className="aspect-square bg-slate-100">
                    {url ? (
                      <img src={url} alt={image.alt_text || "Listing image"} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-1 p-2">
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
                        image.is_primary
                          ? "bg-slate-900 text-white"
                          : "border border-slate-300 text-slate-700"
                      }`}
                      disabled={imageBusy || image.is_primary}
                      onClick={async () => {
                        if (!onSetPrimaryExistingImage) {
                          return;
                        }
                        setImageBusy(true);
                        try {
                          await onSetPrimaryExistingImage(image.id);
                          setPendingImages((prev) =>
                            prev.map((item) => ({ ...item, isPrimary: false })),
                          );
                        } catch (error) {
                          setFormError(
                            getApiErrorMessage(error, "Could not set primary image."),
                          );
                        } finally {
                          setImageBusy(false);
                        }
                      }}
                    >
                      <Star className="h-3 w-3" aria-hidden />
                      {image.is_primary ? "Primary" : "Make primary"}
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 text-slate-600 hover:bg-slate-100"
                      aria-label="Remove image"
                      disabled={imageBusy || !onDeleteExistingImage}
                      onClick={async () => {
                        if (!onDeleteExistingImage) {
                          return;
                        }
                        setImageBusy(true);
                        try {
                          await onDeleteExistingImage(image.id);
                        } catch (error) {
                          setFormError(
                            getApiErrorMessage(error, "Could not remove image."),
                          );
                        } finally {
                          setImageBusy(false);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {pendingImages.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pendingImages.map((image) => (
              <li
                key={image.key}
                className="overflow-hidden rounded-md border border-slate-200 bg-white"
              >
                <div className="aspect-square bg-slate-100">
                  <img
                    src={image.previewUrl}
                    alt={image.file.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-1 p-2">
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
                      image.isPrimary
                        ? "bg-slate-900 text-white"
                        : "border border-slate-300 text-slate-700"
                    }`}
                    onClick={() => markPendingPrimary(image.key)}
                  >
                    <Star className="h-3 w-3" aria-hidden />
                    {image.isPrimary ? "Primary" : "Make primary"}
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-slate-600 hover:bg-slate-100"
                    aria-label="Remove pending image"
                    onClick={() => removePending(image.key)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </fieldset>

      <Button
        type="submit"
        isLoading={form.formState.isSubmitting || imageBusy}
      >
        {submitLabel}
      </Button>
    </form>
  );
}
