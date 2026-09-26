import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";

import { fetchCategories, fetchListings } from "../api/marketplace";
import { getApiErrorMessage } from "../api/client";
import {
  Button,
  CategoryCard,
  EmptyState,
  ErrorMessage,
  ListingGrid,
  LoadingSkeleton,
  SearchBar,
} from "../components";
import { useAuth } from "../features/auth/AuthContext";
import type { TransactionType } from "../types/marketplace";

const TYPE_FILTERS: Array<{ label: string; value: TransactionType | "" }> = [
  { label: "All", value: "" },
  { label: "Sell", value: "SELL" },
  { label: "Borrow", value: "BORROW" },
  { label: "Exchange", value: "EXCHANGE" },
];

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [transactionType, setTransactionType] = useState<TransactionType | "">("");

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    enabled: isAuthenticated,
  });

  const listingsQuery = useQuery({
    queryKey: ["listings", "home", transactionType],
    queryFn: () =>
      fetchListings({
        transaction_type: transactionType || undefined,
        ordering: "-created_at",
        page_size: 6,
      }),
    enabled: isAuthenticated,
  });

  const recent = useMemo(
    () => listingsQuery.data?.results ?? [],
    [listingsQuery.data],
  );

  if (!isAuthenticated) {
    return (
      <section className="space-y-8">
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-10">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            SWUST Campus Marketplace
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Buy, borrow, and exchange student items across campus. Sign in with
            your SWUST email to browse live listings.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => navigate("/login")}>Sign in</Button>
            <Button variant="secondary" onClick={() => navigate("/register")}>
              Register
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-10">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Campus Marketplace
            </h1>
            <p className="mt-2 text-slate-600">
              Find textbooks, bikes, electronics, and more from SWUST students.
            </p>
          </div>
          <Button onClick={() => navigate("/listings/new")}>Add listing</Button>
        </div>
        <SearchBar
          value={search}
          onChange={setSearch}
          onSubmit={() => {
            const params = new URLSearchParams();
            if (search.trim()) {
              params.set("search", search.trim());
            }
            navigate(`/marketplace?${params.toString()}`);
          }}
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Transaction type">
          {TYPE_FILTERS.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm ${
                transactionType === item.value
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700"
              }`}
              onClick={() => setTransactionType(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Categories</h2>
          <Link className="text-sm text-slate-600 underline" to="/marketplace">
            Browse all
          </Link>
        </div>
        {categoriesQuery.isPending ? <LoadingSkeleton count={3} /> : null}
        {categoriesQuery.isError ? (
          <ErrorMessage
            message={getApiErrorMessage(categoriesQuery.error, "Could not load categories.")}
          />
        ) : null}
        {categoriesQuery.data ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categoriesQuery.data.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Recent listings</h2>
          <Link className="text-sm text-slate-600 underline" to="/marketplace">
            View marketplace
          </Link>
        </div>
        {listingsQuery.isPending ? <LoadingSkeleton /> : null}
        {listingsQuery.isError ? (
          <ErrorMessage
            message={getApiErrorMessage(listingsQuery.error, "Could not load listings.")}
          />
        ) : null}
        {listingsQuery.data && recent.length === 0 ? (
          <EmptyState
            title="No listings yet"
            description="Be the first to post an item for sale, borrow, or exchange."
            action={
              <Button onClick={() => navigate("/listings/new")}>Add listing</Button>
            }
          />
        ) : null}
        {recent.length > 0 ? <ListingGrid listings={recent} /> : null}
      </div>
    </section>
  );
}
