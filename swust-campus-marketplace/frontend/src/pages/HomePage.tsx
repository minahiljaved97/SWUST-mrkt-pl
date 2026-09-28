import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";

import { fetchCategories, fetchListings } from "../api/marketplace";
import { getApiErrorMessage } from "../api/client";
import {
  Button,
  Card,
  CategoryCard,
  Chip,
  EmptyState,
  ErrorMessage,
  ListingGrid,
  LoadingSkeleton,
  PageHeader,
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
      <section className="space-y-6">
        <Card padding="lg" className="overflow-hidden">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
            SWUST students
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Campus Marketplace
          </h1>
          <p className="mt-3 max-w-2xl muted">
            Buy, borrow, and exchange student items across campus. Sign in with
            your email to browse live listings.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => navigate("/login")}>
              Sign in
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate("/register")}
            >
              Register
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-10">
      <div className="space-y-5">
        <PageHeader
          eyebrow="Campus marketplace"
          title="Find what you need on campus"
          description="Textbooks, bikes, electronics, and more from SWUST students."
          actions={
            <Button onClick={() => navigate("/listings/new")}>Add listing</Button>
          }
        />
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
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Transaction type"
        >
          {TYPE_FILTERS.map((item) => (
            <Chip
              key={item.label}
              active={transactionType === item.value}
              onClick={() => setTransactionType(item.value)}
            >
              {item.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title">Categories</h2>
          <Link className="text-sm font-medium text-brand-700 hover:underline" to="/marketplace">
            Browse all
          </Link>
        </div>
        {categoriesQuery.isPending ? <LoadingSkeleton count={3} /> : null}
        {categoriesQuery.isError ? (
          <ErrorMessage
            message={getApiErrorMessage(
              categoriesQuery.error,
              "Could not load categories.",
            )}
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
          <h2 className="section-title">Recent listings</h2>
          <Link className="text-sm font-medium text-brand-700 hover:underline" to="/marketplace">
            View marketplace
          </Link>
        </div>
        {listingsQuery.isPending ? <LoadingSkeleton /> : null}
        {listingsQuery.isError ? (
          <ErrorMessage
            message={getApiErrorMessage(
              listingsQuery.error,
              "Could not load listings.",
            )}
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
