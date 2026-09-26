import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, ErrorMessage, Input, Loading } from "../components";
import { useHealth } from "../hooks/useHealth";
import { env } from "../lib/env";

const placeholderSchema = z.object({
  example: z.string().optional(),
});

type PlaceholderValues = z.infer<typeof placeholderSchema>;

export function HomePage() {
  const health = useHealth();
  const form = useForm<PlaceholderValues>({
    resolver: zodResolver(placeholderSchema),
    defaultValues: { example: "" },
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Campus Marketplace</h1>
        <p className="mt-2 max-w-xl text-slate-600">
          Phase 1 foundation is running. Listings, accounts, and messaging are
          not implemented yet.
        </p>
      </div>

      {health.isPending ? <Loading label="Checking API" /> : null}
      {health.isError ? (
        <ErrorMessage message="The API is not reachable. Start Django on port 8000." />
      ) : null}
      {health.data ? (
        <p className="text-sm text-slate-700">
          API status: {health.data.status} ({health.data.api}) at {env.apiBaseUrl}
        </p>
      ) : null}

      <form
        className="max-w-sm space-y-3"
        onSubmit={form.handleSubmit(() => undefined)}
      >
        <Input
          label="Example field"
          placeholder="Reusable input"
          disabled
          {...form.register("example")}
        />
        <Button type="submit" disabled>
          Continue (later phases)
        </Button>
      </form>
    </section>
  );
}
