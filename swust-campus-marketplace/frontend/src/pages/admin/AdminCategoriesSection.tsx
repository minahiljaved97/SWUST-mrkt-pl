import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  createAdminCategory,
  fetchAdminCategories,
  updateAdminCategory,
} from "../../api/admin";
import { getApiErrorMessage } from "../../api/client";
import {
  Button,
  EmptyState,
  ErrorMessage,
  Loading,
  Pagination,
} from "../../components";
import type { AdminCategory } from "../../types/admin";

const PAGE_SIZE = 20;

export function AdminCategoriesSection() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const categoriesQuery = useQuery({
    queryKey: ["admin-categories", page],
    queryFn: () => fetchAdminCategories({ page, page_size: PAGE_SIZE }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createAdminCategory({
        name: name.trim(),
        description: description.trim(),
        sort_order: Number(sortOrder) || 0,
        is_active: true,
      }),
    onSuccess: async () => {
      setName("");
      setDescription("");
      setSortOrder("0");
      setError("");
      setMessage("Category created.");
      await queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, "Could not create category."));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<Pick<AdminCategory, "name" | "description" | "is_active" | "sort_order">>;
    }) => updateAdminCategory(id, payload),
    onSuccess: async () => {
      setError("");
      setMessage("Category updated.");
      await queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, "Could not update category."));
    },
  });

  const categories = categoriesQuery.data?.results ?? [];

  return (
    <section className="space-y-6">
      <form
        className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate();
        }}
      >
        <h2 className="text-sm font-semibold">Create category</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={0}
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            placeholder="Sort order"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" isLoading={createMutation.isPending}>
          Create
        </Button>
      </form>

      {error ? <ErrorMessage message={error} /> : null}
      {message ? (
        <p className="text-sm text-emerald-700" role="status">
          {message}
        </p>
      ) : null}

      {categoriesQuery.isPending ? <Loading label="Loading categories" /> : null}
      {categoriesQuery.isError ? (
        <ErrorMessage
          message={getApiErrorMessage(
            categoriesQuery.error,
            "Could not load categories.",
          )}
        />
      ) : null}
      {!categoriesQuery.isPending && categories.length === 0 ? (
        <EmptyState title="No categories" description="Create the first category." />
      ) : null}

      <ul className="space-y-3">
        {categories.map((category) => (
          <li
            key={category.id}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{category.name}</p>
                <p className="text-sm text-slate-500">
                  {category.slug} · {category.listings_count} listings ·{" "}
                  {category.is_active ? "active" : "inactive"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {category.description || "No description"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  isLoading={updateMutation.isPending}
                  onClick={() => {
                    const next = window.prompt("Edit category name", category.name);
                    if (!next || next.trim() === category.name) {
                      return;
                    }
                    updateMutation.mutate({
                      id: category.id,
                      payload: { name: next.trim() },
                    });
                  }}
                >
                  Edit name
                </Button>
                <Button
                  variant="secondary"
                  isLoading={updateMutation.isPending}
                  onClick={() =>
                    updateMutation.mutate({
                      id: category.id,
                      payload: { is_active: !category.is_active },
                    })
                  }
                >
                  {category.is_active ? "Deactivate" : "Reactivate"}
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={categoriesQuery.data?.count ?? 0}
        onPageChange={setPage}
      />
    </section>
  );
}
