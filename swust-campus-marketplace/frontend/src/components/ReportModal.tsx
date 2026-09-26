import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { createReport } from "../api/reports";
import { getApiErrorMessage } from "../api/client";
import {
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  type ReportReason,
  type ReportTarget,
} from "../types/reports";
import { Button } from "./Button";
import { ErrorMessage } from "./ErrorMessage";
import { Modal } from "./Modal";
import { Select, Textarea } from "./Input";

type ReportModalProps = {
  open: boolean;
  target: ReportTarget | null;
  onClose: () => void;
  onSubmitted?: (message: string) => void;
};

export function ReportModal({
  open,
  target,
  onClose,
  onSubmitted,
}: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason>("SPAM");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setReason("SPAM");
    setDescription("");
    setError("");
    setConfirmation("");
  }, [open, target]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!target) {
        throw new Error("Missing report target");
      }
      return createReport({
        listing: target.type === "listing" ? target.listingId : undefined,
        reported_user: target.type === "user" ? target.userId : undefined,
        reason,
        description: description.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      setError("");
      setConfirmation(data.detail);
      onSubmitted?.(data.detail);
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, "Could not submit report."));
    },
  });

  if (!target) {
    return null;
  }

  const heading =
    target.type === "listing"
      ? `Report listing${target.label ? `: ${target.label}` : ""}`
      : `Report user${target.label ? `: ${target.label}` : ""}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={confirmation ? "Report received" : heading}
      description={
        confirmation
          ? undefined
          : "Reviews are handled privately by campus moderators."
      }
      footer={
        confirmation ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              isLoading={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              Submit report
            </Button>
          </>
        )
      }
    >
      {confirmation ? (
        <p className="muted" role="status">
          {confirmation}
        </p>
      ) : (
        <div className="space-y-4">
          {error ? <ErrorMessage message={error} /> : null}
          <Select
            label="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value as ReportReason)}
          >
            {REPORT_REASONS.map((value) => (
              <option key={value} value={value}>
                {REPORT_REASON_LABELS[value]}
              </option>
            ))}
          </Select>
          <Textarea
            label="Description (optional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={2000}
            hint="Add any details that help moderators review this."
          />
        </div>
      )}
    </Modal>
  );
}
