import type { ListingCondition, TransactionType } from "../types/marketplace";

export type MarketplaceFilterState = {
  category: string;
  condition: ListingCondition | "";
  transactionType: TransactionType | "";
  priceMin: string;
  priceMax: string;
  ordering: string;
};

type FilterPanelProps = {
  filters: MarketplaceFilterState;
  categories: Array<{ slug: string; name: string }>;
  onChange: (patch: Partial<MarketplaceFilterState>) => void;
};

const CONDITIONS: ListingCondition[] = ["NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"];
const TYPES: TransactionType[] = ["SELL", "BORROW", "EXCHANGE"];

export function FilterPanel({ filters, categories, onChange }: FilterPanelProps) {
  return (
    <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Filters</h2>

      <label className="block text-sm text-slate-700">
        <span className="mb-1 block font-medium">Category</span>
        <select
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          value={filters.category}
          onChange={(event) => onChange({ category: event.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm text-slate-700">
        <span className="mb-1 block font-medium">Condition</span>
        <select
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          value={filters.condition}
          onChange={(event) =>
            onChange({ condition: event.target.value as ListingCondition | "" })
          }
        >
          <option value="">Any</option>
          {CONDITIONS.map((item) => (
            <option key={item} value={item}>
              {item.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm text-slate-700">
        <span className="mb-1 block font-medium">Transaction type</span>
        <select
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          value={filters.transactionType}
          onChange={(event) =>
            onChange({
              transactionType: event.target.value as TransactionType | "",
            })
          }
        >
          <option value="">Any</option>
          {TYPES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm text-slate-700">
          <span className="mb-1 block font-medium">Min price</span>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={filters.priceMin}
            onChange={(event) => onChange({ priceMin: event.target.value })}
          />
        </label>
        <label className="block text-sm text-slate-700">
          <span className="mb-1 block font-medium">Max price</span>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={filters.priceMax}
            onChange={(event) => onChange({ priceMax: event.target.value })}
          />
        </label>
      </div>

      <label className="block text-sm text-slate-700">
        <span className="mb-1 block font-medium">Sort by</span>
        <select
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          value={filters.ordering}
          onChange={(event) => onChange({ ordering: event.target.value })}
        >
          <option value="-created_at">Newest</option>
          <option value="created_at">Oldest</option>
          <option value="price">Price: low to high</option>
          <option value="-price">Price: high to low</option>
          <option value="title">Title A–Z</option>
        </select>
      </label>
    </aside>
  );
}
