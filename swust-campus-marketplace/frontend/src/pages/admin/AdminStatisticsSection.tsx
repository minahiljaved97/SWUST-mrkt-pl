import { useQuery } from "@tanstack/react-query";

import { fetchAdminStatistics } from "../../api/admin";
import { getApiErrorMessage } from "../../api/client";
import { ErrorMessage, Loading, SimpleBarChart } from "../../components";

export function AdminStatisticsSection() {
  const statsQuery = useQuery({
    queryKey: ["admin-statistics"],
    queryFn: fetchAdminStatistics,
  });

  if (statsQuery.isPending) {
    return <Loading label="Loading statistics" />;
  }

  if (statsQuery.isError || !statsQuery.data) {
    return (
      <ErrorMessage
        message={getApiErrorMessage(
          statsQuery.error,
          "Could not load marketplace statistics.",
        )}
      />
    );
  }

  const stats = statsQuery.data;

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SimpleBarChart
        title="Listings by category"
        points={stats.listings_by_category}
      />
      <SimpleBarChart
        title="Listings by transaction type"
        points={stats.listings_by_transaction_type}
      />
      <SimpleBarChart
        title="Listing status distribution"
        points={stats.listing_status_distribution}
      />
      <SimpleBarChart
        title="Listings created (last 30 days)"
        points={stats.listings_created_over_time}
      />
    </section>
  );
}
