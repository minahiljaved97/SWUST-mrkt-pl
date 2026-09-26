const ACCESS_KEY = "swust_access_token";
const REFRESH_KEY = "swust_refresh_token";

export const tokenStorage = {
  getAccess(): string | null {
    return sessionStorage.getItem(ACCESS_KEY);
  },
  getRefresh(): string | null {
    return sessionStorage.getItem(REFRESH_KEY);
  },
  setTokens(access: string, refresh: string) {
    sessionStorage.setItem(ACCESS_KEY, access);
    sessionStorage.setItem(REFRESH_KEY, refresh);
  },
  setAccess(access: string) {
    sessionStorage.setItem(ACCESS_KEY, access);
  },
  clear() {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  },
};
