import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  fetchAdminReports,
  updateAdminReport,
} from "../api/reports";
import { getApiErrorMessage } from "../api/client";
import {
  Button,
  EmptyState,
  ErrorMessage,
  Loading,
  Pagination,
} from "../components";
import { formatDate, sellerName } from "../lib/format";
import {
  REPORT_REASON_LABELS,
  REPORT_STATUSES,
  type AdminReport,
  type ReportStatus,
} from "../types/reports";

const PAGE_SIZE = 12;

function ReportModerationCard({
  report,
  onSaved,
}: {
  report: AdminReport;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<ReportStatus>(report.status);
  const [notes, setNotes] = useState(report.admin_notes);
  const [removeListing, setRemoveListing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      updateAdminReport(report.id, {
        status,
        admin_notes: notes,
        remove_listing: removeListing || undefined,
      }),
    onSuccess: () => {
      setError("");
      setMessage("Report updated.");
      setRemoveListing(false);
      onSaved();
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, "Could not update report."));
    },
  });

  return (
    <li className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {REPORT_REASON_LABELS[report.reason]} · {report.status}
          </p>
          <p className="text-xs text-slate-500">
            Filed {formatDate(report.created_at)} by{" "}
            {sellerName(
              report.reporter.first_name,
              report.reporter.last_name,
            )}
          </p>
        </div>
        {report.listing ? (
          <Link
            className="text-sm underline"
            to={`/marketplace/${report.listing.id}`}
          >
            {report.listing.title}
          </Link>
        ) : null}
      </div>

      {report.reported_user ? (
        <p className="text-sm text-slate-600">
          Reported user:{" "}
          {sellerName(
            report.reported_user.first_name,
            report.reported_user.last_name,
          )}
        </p>
      ) : null}

      {report.description ? (
        <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          {report.description}
        </p>
      ) : (
        <p className="text-sm text-slate-400">No description provided.</p>
      )}

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Status</span>
        <select
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          value={status}
          onChange={(event) => setStatus(event.target.value as ReportStatus)}
        >
          {REPORT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Admin notes</span>
        <textarea
          className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      {report.listing ? (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={removeListing}
            onChange={(event) => setRemoveListing(event.target.checked)}
          />
          Hide / remove the reported listing
        </label>
      ) : null}

      {error ? <ErrorMessage message={error} /> : null}
      {message ? (
        <p className="text-sm text-emerald-700" role="status">
          {message}
        </p>
      ) : null}

      <Button
        isLoading={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        Save moderation
      </Button>
    </li>
  );
}

export function AdminReportsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const statusFilter = (searchParams.get("status") ?? "") as ReportStatus | "";

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const reportsQuery = useQuery({
    queryKey: ["admin-reports", page, statusFilter],
    queryFn: () =>
      fetchAdminReports({
        page,
        page_size: PAGE_SIZE,
        status: statusFilter,
      }),
  });

  const reports = reportsQuery.data?.results ?? [];
  const total = reportsQuery.data?.count ?? 0;

  return (
    <section className="space-y-6">
      <label className="block max-w-xs text-sm">
        <span className="mb-1 block font-medium">Filter by status</span>
        <select
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          value={statusFilter}
          onChange={(event) => {
            const value = event.target.value;
            const params = new URLSearchParams();
            if (value) {
              params.set("status", value);
            }
            setSearchParams(params);
          }}
        >
          <option value="">All</option>
          {REPORT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      {reportsQuery.isPending ? <Loading label="Loading reports" /> : null}
      {reportsQuery.isError ? (
        <ErrorMessage
          message={getApiErrorMessage(
            reportsQuery.error,
            "Could not load reports.",
          )}
        />
      ) : null}

      {!reportsQuery.isPending && reports.length === 0 ? (
        <EmptyState
          title="No reports"
          description="There are no reports matching this filter."
        />
      ) : null}

      {reports.length > 0 ? (
        <ul className="space-y-4">
          {reports.map((report) => (
            <ReportModerationCard
              key={report.id}
              report={report}
              onSaved={() => {
                void queryClient.invalidateQueries({
                  queryKey: ["admin-reports"],
                });
              }}
            />
          ))}
        </ul>
      ) : null}

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
      />
    </section>
  );
}
