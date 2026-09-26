type LoadingProps = {
  label?: string;
};

export function Loading({ label = "Loading" }: LoadingProps) {
  return (
    <div
      className="flex items-center gap-2 text-sm text-slate-600"
      role="status"
      aria-live="polite"
    >
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      <span>{label}</span>
    </div>
  );
}
