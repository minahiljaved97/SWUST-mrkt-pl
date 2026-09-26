import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { fetchCategories, fetchListings } from "../api/marketplace";
import { getApiErrorMessage } from "../api/client";
import {
  Button,
  EmptyState,
  ErrorMessage,
  FilterPanel,
  ListingGrid,
  LoadingSkeleton,
  Pagination,
  SearchBar,
  type MarketplaceFilterState,
} from "../components";
import type { ListingCondition, TransactionType } from "../types/marketplace";

const PAGE_SIZE = 12;

export function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");

  const filters: MarketplaceFilterState = useMemo(
    () => ({
      category: searchParams.get("category") ?? "",
      condition: (searchParams.get("condition") as ListingCondition | "") || "",
      transactionType:
        (searchParams.get("transaction_type") as TransactionType | "") || "",
      priceMin: searchParams.get("price_min") ?? "",
      priceMax: searchParams.get("price_max") ?? "",
      ordering: searchParams.get("ordering") ?? "-created_at",
    }),
    [searchParams],
  );
  const page = Number(searchParams.get("page") || "1");
  const search = searchParams.get("search") ?? "";

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const updateParams = (patch: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === "") {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    }
    setSearchParams(next);
  };

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const listingsQuery = useQuery({
    queryKey: ["listings", "marketplace", search, filters, page],
    queryFn: () =>
      fetchListings({
        search: search || undefined,
        category: filters.category || undefined,
        condition: filters.condition || undefined,
        transaction_type: filters.transactionType || undefined,
        price_min: filters.priceMin || undefined,
        price_max: filters.priceMax || undefined,
        ordering: filters.ordering,
        page,
        page_size: PAGE_SIZE,
      }),
  });

  const listings = listingsQuery.data?.results ?? [];
  const total = listingsQuery.data?.count ?? 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Marketplace</h1>
          <p className="mt-1 text-sm text-slate-600">
            Search and filter live campus listings.
          </p>
        </div>
        <Button as-child={undefined} onClick={() => undefined}>
          <Link to="/listings/new">Add listing</Link>
        </Button>
      </div>

      <SearchBar
        value={searchInput}
        onChange={setSearchInput}
        onSubmit={() => updateParams({ search: searchInput.trim(), page: 1 })}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <FilterPanel
          filters={filters}
          categories={(categoriesQuery.data ?? []).map((item) => ({
            slug: item.slug,
            name: item.name,
          }))}
          onChange={(patch) => {
            updateParams({
              category: patch.category ?? filters.category,
              condition: patch.condition ?? filters.condition,
              transaction_type: patch.transactionType ?? filters.transactionType,
              price_min: patch.priceMin ?? filters.priceMin,
              price_max: patch.priceMax ?? filters.priceMax,
              ordering: patch.ordering ?? filters.ordering,
              page: 1,
            });
          }}
        />

        <div className="space-y-4">
          {listingsQuery.isPending ? <LoadingSkeleton /> : null}
          {listingsQuery.isError ? (
            <ErrorMessage
              message={getApiErrorMessage(
                listingsQuery.error,
                "Could not load marketplace listings.",
              )}
            />
          ) : null}
          {!listingsQuery.isPending && !listingsQuery.isError && listings.length === 0 ? (
            <EmptyState
              title="No matching listings"
              description="Try clearing filters or posting a new item."
              action={
                <Link className="text-sm underline" to="/listings/new">
                  Add listing
                </Link>
              }
            />
          ) : null}
          {listings.length > 0 ? <ListingGrid listings={listings} /> : null}
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={(nextPage) => updateParams({ page: nextPage })}
          />
        </div>
      </div>
    </section>
  );
}
