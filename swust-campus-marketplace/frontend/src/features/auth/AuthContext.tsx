import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  fetchMe,
  loginUser,
  logoutUser,
  registerUser,
  updateMe,
} from "../../api/auth";
import { tokenStorage } from "../../lib/tokenStorage";
import type {
  LoginPayload,
  MeUpdatePayload,
  RegisterPayload,
  User,
} from "../../types/auth";

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isBootstrapping: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  updateProfile: (payload: MeUpdatePayload) => Promise<User>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!tokenStorage.getAccess() && !tokenStorage.getRefresh()) {
      setUser(null);
      return null;
    }
    try {
      const me = await fetchMe();
      setUser(me);
      return me;
    } catch {
      tokenStorage.clear();
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await refreshUser();
      setIsBootstrapping(false);
    })();
  }, [refreshUser]);

  const login = useCallback(async (payload: LoginPayload) => {
    const data = await loginUser(payload);
    tokenStorage.setTokens(data.access, data.refresh);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const created = await registerUser(payload);
    const data = await loginUser({
      email: payload.email,
      password: payload.password,
    });
    tokenStorage.setTokens(data.access, data.refresh);
    setUser(data.user ?? created);
    return data.user ?? created;
  }, []);

  const logout = useCallback(async () => {
    const refresh = tokenStorage.getRefresh();
    try {
      if (refresh) {
        await logoutUser(refresh);
      }
    } catch {
      // Always clear local session even if blacklist fails.
    } finally {
      tokenStorage.clear();
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (payload: MeUpdatePayload) => {
    const updated = await updateMe(payload);
    setUser(updated);
    return updated;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "ADMIN",
      isBootstrapping,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
    }),
    [
      user,
      isBootstrapping,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
