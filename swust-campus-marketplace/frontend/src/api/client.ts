import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { env } from "../lib/env";
import { tokenStorage } from "../lib/tokenStorage";
import type { ApiErrorBody } from "../types/auth";

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) {
    return null;
  }

  try {
    const { data } = await axios.post<{ access: string; refresh?: string }>(
      `${env.apiBaseUrl}/auth/token/refresh/`,
      { refresh },
      { headers: { "Content-Type": "application/json" } },
    );
    const nextRefresh = data.refresh ?? refresh;
    tokenStorage.setTokens(data.access, nextRefresh);
    return data.access;
  } catch {
    tokenStorage.clear();
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    if (
      !original ||
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.includes("/auth/login/") ||
      original.url?.includes("/auth/register/") ||
      original.url?.includes("/auth/token/refresh/")
    ) {
      return Promise.reject(error);
    }

    original._retry = true;
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
    const access = await refreshPromise;
    if (!access) {
      return Promise.reject(error);
    }
    original.headers.Authorization = `Bearer ${access}`;
    return apiClient(original);
  },
);

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }
  const data = error.response?.data as ApiErrorBody | undefined;
  if (typeof data?.detail === "string" && data.detail) {
    return data.detail;
  }
  if (data?.errors && typeof data.errors === "object") {
    const first = Object.values(data.errors)[0];
    if (Array.isArray(first) && typeof first[0] === "string") {
      return first[0];
    }
    if (typeof first === "string") {
      return first;
    }
  }
  return fallback;
}

export function getFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) {
    return {};
  }
  const data = error.response?.data as ApiErrorBody | undefined;
  const errors = data?.errors;
  if (!errors || typeof errors !== "object") {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(errors)) {
    if (Array.isArray(value) && typeof value[0] === "string") {
      result[key] = value[0];
    } else if (typeof value === "string") {
      result[key] = value;
    }
  }
  return result;
}
