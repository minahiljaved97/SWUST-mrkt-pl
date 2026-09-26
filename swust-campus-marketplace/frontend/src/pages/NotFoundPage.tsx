import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link className="text-sm text-slate-600 underline" to="/">
        Back home
      </Link>
    </section>
  );
}
