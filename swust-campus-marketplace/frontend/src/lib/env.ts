function isLocalhostApiUrl(url: string): boolean {
  try {
    if (url.startsWith("/")) {
      return false;
    }
    const host = new URL(url).hostname;
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "0.0.0.0"
    );
  } catch {
    return false;
  }
}

function assertSafeApiBaseUrl(url: string, requireHttpsProduction: boolean) {
  if (url.startsWith("/") && !url.startsWith("//")) {
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      `VITE_API_BASE_URL must be an absolute http(s) URL or a path starting with /, got: ${url}`,
    );
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("VITE_API_BASE_URL must use http: or https:");
  }
  if (requireHttpsProduction && parsed.protocol !== "https:") {
    throw new Error(
      "VITE_API_BASE_URL must use https:// in production (except same-origin paths).",
    );
  }
  if (requireHttpsProduction && isLocalhostApiUrl(url)) {
    throw new Error(
      "VITE_API_BASE_URL must not point at localhost in production.",
    );
  }
}

function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!raw) {
    throw new Error(
      "VITE_API_BASE_URL is missing. Copy frontend/.env.example to frontend/.env",
    );
  }
  const normalized = raw.replace(/\/$/, "");
  assertSafeApiBaseUrl(normalized, import.meta.env.PROD);
  return normalized;
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
} as const;
