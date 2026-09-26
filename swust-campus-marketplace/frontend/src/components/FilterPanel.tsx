import type { ListingCondition, TransactionType } from "../types/marketplace";
import { Select, Input } from "./Input";

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
    <aside className="surface-card space-y-4 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900">Filters</h2>

      <Select
        label="Category"
        value={filters.category}
        onChange={(event) => onChange({ category: event.target.value })}
      >
        <option value="">All categories</option>
        {categories.map((item) => (
          <option key={item.slug} value={item.slug}>
            {item.name}
          </option>
        ))}
      </Select>

      <Select
        label="Condition"
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
      </Select>

      <Select
        label="Transaction type"
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
      </Select>

      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Min price"
          type="number"
          min="0"
          step="0.01"
          value={filters.priceMin}
          onChange={(event) => onChange({ priceMin: event.target.value })}
        />
        <Input
          label="Max price"
          type="number"
          min="0"
          step="0.01"
          value={filters.priceMax}
          onChange={(event) => onChange({ priceMax: event.target.value })}
        />
      </div>

      <Select
        label="Sort by"
        value={filters.ordering}
        onChange={(event) => onChange({ ordering: event.target.value })}
      >
        <option value="-created_at">Newest</option>
        <option value="created_at">Oldest</option>
        <option value="price">Price: low to high</option>
        <option value="-price">Price: high to low</option>
        <option value="title">Title A–Z</option>
      </Select>
    </aside>
  );
}
