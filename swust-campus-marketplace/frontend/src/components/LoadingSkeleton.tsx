type LoadingSkeletonProps = {
  count?: number;
  variant?: "listings" | "rows" | "detail";
};

function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/90 ${className}`} />;
}

export function LoadingSkeleton({
  count = 6,
  variant = "listings",
}: LoadingSkeletonProps) {
  if (variant === "rows") {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="surface-card p-4">
            <Pulse className="h-4 w-1/3" />
            <Pulse className="mt-3 h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
        aria-busy="true"
        aria-label="Loading detail"
      >
        <Pulse className="aspect-[4/3] w-full rounded-[var(--radius-card)]" />
        <div className="space-y-3">
          <Pulse className="h-8 w-3/4" />
          <Pulse className="h-5 w-1/3" />
          <Pulse className="h-4 w-full" />
          <Pulse className="h-4 w-5/6" />
          <Pulse className="h-10 w-40" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading listings"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="surface-card overflow-hidden">
          <Pulse className="aspect-[4/3] rounded-none" />
          <div className="space-y-2 p-4">
            <Pulse className="h-4 w-3/4" />
            <Pulse className="h-3 w-1/2" />
            <Pulse className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
