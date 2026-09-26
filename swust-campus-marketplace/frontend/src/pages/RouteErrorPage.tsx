import { isRouteErrorResponse, useRouteError } from "react-router-dom";

export function RouteErrorPage() {
  const error = useRouteError();
  let detail = "This page could not be loaded.";

  if (isRouteErrorResponse(error)) {
    detail =
      error.status === 404
        ? "We could not find that page."
        : error.statusText || detail;
  } else if (error instanceof Error && error.message) {
    detail = import.meta.env.PROD ? detail : error.message;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Page error</h1>
        <p className="mt-3 text-[var(--color-muted)]">{detail}</p>
        <a
          href="/"
          className="mt-8 inline-flex rounded-md bg-[var(--color-ink)] px-5 py-2.5 text-sm text-white"
        >
          Back to home
        </a>
      </div>
    </div>
  );
}
