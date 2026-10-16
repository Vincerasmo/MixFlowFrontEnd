import axios, { type AxiosError } from "axios";
import { getToken, clearSession } from "../auth/session.storage";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://mixflow.runasp.net/api";

/**
 * Routes that are safe to view without a session. A 401 while one of these is
 * on screen must NOT kick the visitor to the login page — the whole point of
 * a shared /watch or /report link is that it works for someone who has never
 * logged in. The login/register pages themselves are also listed so a failed
 * login attempt doesn't redirect-loop.
 */
function isOnPublicRoute(): boolean {
  const path = window.location.pathname;
  return (
    path === "/" ||
    path === "/register" ||
    path.startsWith("/watch/") ||
    path.startsWith("/report/")
  );
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface NormalizedApiError {
  status: number;
  message: string;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    const status = error.response?.status ?? 0;
    const message =
      error.response?.data?.error ??
      error.response?.data?.message ??
      error.message ??
      "Something went wrong. Please try again.";

    if (status === 401) {
      // Capture before we clear — we only want to redirect if we actually had
      // a session to lose. A 401 with no token on hand (e.g. an organizer
      // accidentally pasting an old URL into a fresh browser) is a routing
      // problem, not an expiry problem, and RequireAuth handles that already.
      const hadToken = !!getToken();
      clearSession();

      if (hadToken && !isOnPublicRoute()) {
        // Hard reload — this tears down the whole React tree, so any component
        // still holding a stale organizer object or mid-flight request is
        // discarded rather than left to render half-broken.
        window.location.assign("/");
      }
    }

    return Promise.reject({ status, message } satisfies NormalizedApiError);
  }
);

export default apiClient;