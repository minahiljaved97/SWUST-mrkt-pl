import { env } from "./env";

/** Resolve media paths that may be relative to the Django host. */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const apiOrigin = env.apiBaseUrl.replace(/\/api\/v1\/?$/, "");
  return `${apiOrigin}${url.startsWith("/") ? url : `/${url}`}`;
}
