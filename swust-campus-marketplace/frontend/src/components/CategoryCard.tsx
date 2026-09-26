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
      className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-400"
    >
      <h3 className="font-medium text-slate-900">{category.name}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
        {category.description || "Browse this category"}
      </p>
    </Link>
  );
}
