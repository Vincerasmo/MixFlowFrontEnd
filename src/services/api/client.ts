import axios, { type AxiosError } from "axios";
import { getToken, clearSession } from "../auth/session.storage";

const API_BASE_URL = import.meta.env.VITE_API_URL

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

    // Token expired or invalid — drop the local session so the UI can react.
    if (status === 401) {
      clearSession();
    }

    return Promise.reject({ status, message } satisfies NormalizedApiError);
  }
);