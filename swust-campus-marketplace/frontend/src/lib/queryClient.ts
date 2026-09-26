import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Do not retry auth / permission failures.
        if (
          error &&
          typeof error === "object" &&
          "response" in error &&
          typeof (error as { response?: { status?: number } }).response
            ?.status === "number"
        ) {
          const status = (error as { response: { status: number } }).response
            .status;
          if (status === 401 || status === 403 || status === 404) {
            return false;
          }
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      // Surface stale data briefly offline / after errors instead of blanking UI.
      throwOnError: false,
    },
    mutations: {
      retry: false,
      throwOnError: false,
    },
  },
});
