import { apiClient } from "./client";
import type {
  LoginPayload,
  LoginResponse,
  MeUpdatePayload,
  RegisterPayload,
  User,
} from "../types/auth";

export async function registerUser(payload: RegisterPayload): Promise<User> {
  const { data } = await apiClient.post<User>("/auth/register/", payload);
  return data;
}

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/login/", payload);
  return data;
}

export async function refreshTokens(refresh: string) {
  const { data } = await apiClient.post<{ access: string; refresh?: string }>(
    "/auth/token/refresh/",
    { refresh },
  );
  return data;
}

export async function logoutUser(refresh: string): Promise<void> {
  await apiClient.post("/auth/logout/", { refresh });
}

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me/");
  return data;
}

export async function updateMe(payload: MeUpdatePayload): Promise<User> {
  const { data } = await apiClient.patch<User>("/auth/me/", payload);
  return data;
}

export async function fetchAdminUsers(): Promise<User[]> {
  const { data } = await apiClient.get<{ results?: User[] } | User[]>("/auth/users/");
  if (Array.isArray(data)) {
    return data;
  }
  return data.results ?? [];
}
