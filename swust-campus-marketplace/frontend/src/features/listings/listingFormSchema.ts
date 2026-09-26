import { z } from "zod";

export const listingFormSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters"),
    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters"),
    category: z.string().min(1, "Category is required"),
    price: z.string().trim().min(1, "Price is required"),
    condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"]),
    transaction_type: z.enum(["SELL", "BORROW", "EXCHANGE"]),
    location: z.string().trim().min(2, "Location is required"),
    preferred_exchange_item: z.string().optional(),
    exchange_description: z.string().optional(),
    status: z
      .enum([
        "ACTIVE",
        "RESERVED",
        "SOLD",
        "BORROWED",
        "EXCHANGED",
        "CLOSED",
      ])
      .optional(),
  })
  .superRefine((values, ctx) => {
    const price = Number(values.price);
    if (Number.isNaN(price) || price < 0) {
      ctx.addIssue({
        code: "custom",
        path: ["price"],
        message: "Enter a valid non-negative price",
      });
    }
    if (values.transaction_type === "SELL" && !(price > 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["price"],
        message: "Sell listings require a price greater than zero",
      });
    }
    if (values.transaction_type === "EXCHANGE") {
      const preferred = values.preferred_exchange_item?.trim() ?? "";
      const details = values.exchange_description?.trim() ?? "";
      if (!preferred && !details) {
        ctx.addIssue({
          code: "custom",
          path: ["preferred_exchange_item"],
          message: "Add a preferred item or exchange description",
        });
      }
    }
  });

export type ListingFormValues = z.infer<typeof listingFormSchema>;

export type PendingImage = {
  key: string;
  file: File;
  previewUrl: string;
  isPrimary: boolean;
};
