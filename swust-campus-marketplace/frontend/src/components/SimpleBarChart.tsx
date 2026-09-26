import type { ChartPoint } from "../types/admin";
import { Card } from "./Card";

type SimpleBarChartProps = {
  title: string;
  points: ChartPoint[];
  emptyLabel?: string;
};

export function SimpleBarChart({
  title,
  points,
  emptyLabel = "No data yet",
}: SimpleBarChartProps) {
  const max = Math.max(1, ...points.map((point) => point.count));

  return (
    <Card padding="md">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {points.length === 0 ? (
        <p className="mt-4 muted">{emptyLabel}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {points.map((point) => (
            <li key={point.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-600">
                <span className="truncate">{point.label}</span>
                <span className="shrink-0 font-semibold text-slate-900">
                  {point.count}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-700"
                  style={{ width: `${(point.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
