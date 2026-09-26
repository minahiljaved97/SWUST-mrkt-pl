import { Link } from "react-router-dom";

import type { Category } from "../types/marketplace";

type CategoryCardProps = {
  category: Category;
  to?: string;
};

export function CategoryCard({ category, to }: CategoryCardProps) {
  const href = to ?? `/marketplace?category=${category.slug}`;
  return (
    <Link
      to={href}
      className="surface-card block p-4 transition hover:border-brand-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <h3 className="font-semibold text-slate-900">{category.name}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
        {category.description || "Browse this category"}
      </p>
    </Link>
  );
}
