export type ReportReason =
  | "SPAM"
  | "FRAUD"
  | "INAPPROPRIATE_CONTENT"
  | "WRONG_INFORMATION"
  | "DUPLICATE_LISTING"
  | "OTHER";

export type ReportStatus =
  | "PENDING"
  | "REVIEWING"
  | "RESOLVED"
  | "DISMISSED";

export type ReportTarget =
  | { type: "listing"; listingId: string; label?: string }
  | { type: "user"; userId: string; label?: string };

export type StudentReportResponse = {
  id: string;
  detail: string;
};

export type AdminReport = {
  id: string;
  reporter: {
    id: string;
    first_name: string;
    last_name: string;
    campus_location: string;
  };
  listing: import("./marketplace").Listing | null;
  listing_id: string | null;
  reported_user: {
    id: string;
    first_name: string;
    last_name: string;
    campus_location: string;
  } | null;
  reported_user_id: string | null;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  admin_notes: string;
  created_at: string;
  updated_at: string;
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  SPAM: "Spam",
  FRAUD: "Fraud / scam",
  INAPPROPRIATE_CONTENT: "Inappropriate content",
  WRONG_INFORMATION: "Wrong information",
  DUPLICATE_LISTING: "Duplicate listing",
  OTHER: "Other",
};

export const REPORT_REASONS = Object.keys(
  REPORT_REASON_LABELS,
) as ReportReason[];

export const REPORT_STATUSES: ReportStatus[] = [
  "PENDING",
  "REVIEWING",
  "RESOLVED",
  "DISMISSED",
];
