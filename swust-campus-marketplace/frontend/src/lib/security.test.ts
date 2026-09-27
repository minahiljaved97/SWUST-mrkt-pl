import assert from "node:assert/strict";
import { describe, it } from "node:test";

const ACCESS_KEY = "swust_access_token";
const REFRESH_KEY = "swust_refresh_token";

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
  };
}

function makeTokenStorage(storage: ReturnType<typeof createMemoryStorage>) {
  return {
    getAccess() {
      return storage.getItem(ACCESS_KEY);
    },
    getRefresh() {
      return storage.getItem(REFRESH_KEY);
    },
    setTokens(access: string, refresh: string) {
      storage.setItem(ACCESS_KEY, access);
      storage.setItem(REFRESH_KEY, refresh);
    },
    clear() {
      storage.removeItem(ACCESS_KEY);
      storage.removeItem(REFRESH_KEY);
    },
  };
}

export function canAccessAdminRoute(options: {
  isAuthenticated: boolean;
  isAdmin: boolean;
}): "ok" | "login" | "forbidden" {
  if (!options.isAuthenticated) {
    return "login";
  }
  if (!options.isAdmin) {
    return "forbidden";
  }
  return "ok";
}

export function isSafeExternalApiBase(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) {
    return true;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

describe("token storage contract", () => {
  it("stores and clears access/refresh tokens", () => {
    const storage = makeTokenStorage(createMemoryStorage());
    storage.setTokens("access-1", "refresh-1");
    assert.equal(storage.getAccess(), "access-1");
    assert.equal(storage.getRefresh(), "refresh-1");
    storage.clear();
    assert.equal(storage.getAccess(), null);
    assert.equal(storage.getRefresh(), null);
  });
});

describe("route guards", () => {
  it("requires login then admin for admin routes", () => {
    assert.equal(
      canAccessAdminRoute({ isAuthenticated: false, isAdmin: false }),
      "login",
    );
    assert.equal(
      canAccessAdminRoute({ isAuthenticated: true, isAdmin: false }),
      "forbidden",
    );
    assert.equal(
      canAccessAdminRoute({ isAuthenticated: true, isAdmin: true }),
      "ok",
    );
  });
});

describe("API base URL safety", () => {
  it("accepts http(s) URLs and same-origin paths only", () => {
    assert.equal(isSafeExternalApiBase("http://127.0.0.1:8000/api/v1"), true);
    assert.equal(isSafeExternalApiBase("https://api.example.com/v1"), true);
    assert.equal(isSafeExternalApiBase("/api/v1"), true);
    assert.equal(isSafeExternalApiBase("javascript:alert(1)"), false);
    assert.equal(isSafeExternalApiBase("not-a-url"), false);
    assert.equal(isSafeExternalApiBase("//evil.example/api"), false);
  });
});
