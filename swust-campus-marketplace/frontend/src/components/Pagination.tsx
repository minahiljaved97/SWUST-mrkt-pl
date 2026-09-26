import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "./Button";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  label?: string;
};

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  label = "results",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4"
      aria-label="Pagination"
    >
      <p className="text-sm text-slate-600">
        Page {page} of {totalPages} · {total} {label}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          leftIcon={<ChevronLeft className="h-4 w-4" aria-hidden />}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          rightIcon={<ChevronRight className="h-4 w-4" aria-hidden />}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
