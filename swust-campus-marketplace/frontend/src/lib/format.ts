import type { ListingCondition, TransactionType } from "../types/marketplace";

export function formatPrice(price: string, transactionType: TransactionType): string {
  const value = Number(price);
  if (Number.isNaN(value)) {
    return price;
  }
  if (transactionType !== "SELL" && value === 0) {
    return transactionType === "BORROW" ? "Borrow" : "Exchange";
  }
  return new Intl.NumberFormat("en-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCondition(condition: ListingCondition): string {
  return condition.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function sellerName(first: string, last: string): string {
  const full = `${first} ${last}`.trim();
  return full || "SWUST student";
}
