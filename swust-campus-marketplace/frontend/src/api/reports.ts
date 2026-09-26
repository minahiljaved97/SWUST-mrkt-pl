import { apiClient } from "./client";
import type { Paginated } from "../types/marketplace";
import type {
  AdminReport,
  ReportReason,
  ReportStatus,
  StudentReportResponse,
} from "../types/reports";

export async function createReport(payload: {
  listing?: string;
  reported_user?: string;
  reason: ReportReason;
  description?: string;
}): Promise<StudentReportResponse> {
  const { data } = await apiClient.post<StudentReportResponse>(
    "/reports/",
    payload,
  );
  return data;
}

export async function fetchAdminReports(params?: {
  page?: number;
  page_size?: number;
  status?: ReportStatus | "";
}): Promise<Paginated<AdminReport>> {
  const { data } = await apiClient.get<Paginated<AdminReport>>(
    "/admin/reports/",
    { params },
  );
  return data;
}

export async function fetchAdminReport(
  reportId: string,
): Promise<AdminReport> {
  const { data } = await apiClient.get<AdminReport>(
    `/admin/reports/${reportId}/`,
  );
  return data;
}

export async function updateAdminReport(
  reportId: string,
  payload: {
    status?: ReportStatus;
    admin_notes?: string;
    remove_listing?: boolean;
  },
): Promise<AdminReport> {
  const { data } = await apiClient.patch<AdminReport>(
    `/admin/reports/${reportId}/`,
    payload,
  );
  return data;
}
