import { LoaderCircle } from "lucide-react";

type LoadingProps = {
  label?: string;
  className?: string;
};

export function Loading({ label = "Loading", className = "" }: LoadingProps) {
  return (
    <div
      className={`flex items-center justify-center gap-2 py-10 text-sm text-slate-600 ${className}`}
      role="status"
      aria-live="polite"
    >
      <LoaderCircle className="h-4 w-4 animate-spin text-brand-700" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
