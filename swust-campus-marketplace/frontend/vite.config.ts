import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function assertApiBaseUrl(apiBase: string) {
  if (apiBase.startsWith("/") && !apiBase.startsWith("//")) {
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(apiBase);
  } catch {
    throw new Error(
      `VITE_API_BASE_URL must be an absolute http(s) URL or a path starting with /, got: ${apiBase}`,
    );
  }
  if (parsed.protocol !== "https:") {
    throw new Error(
      "Production VITE_API_BASE_URL must use https:// (or a same-origin path like /api/v1).",
    );
  }
  const host = parsed.hostname;
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0"
  ) {
    throw new Error(
      "Production VITE_API_BASE_URL must not use localhost / 127.0.0.1.",
    );
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (mode === "production") {
    const apiBase = env.VITE_API_BASE_URL?.trim();
    if (!apiBase) {
      throw new Error(
        "VITE_API_BASE_URL is required for production builds. Set it in Vercel or .env.production.",
      );
    }
    assertApiBaseUrl(apiBase);
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
  };
});
