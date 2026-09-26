import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
};

export function EmptyState({
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div className="surface-card px-6 py-12 text-center sm:px-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden />}
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-md muted">{description}</p>
      ) : null}
      {action ? (
        <div className="mt-5 flex justify-center">{action}</div>
      ) : null}
    </div>
  );
}
