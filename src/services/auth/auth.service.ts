import { apiClient } from "../api/client";
import { setSession } from "./session.storage";
import type {
  AuthResponseDto,
  EmailLoginPayload,
  EmailSignupPayload,
  GoogleLoginPayload,
  OrganizerDto,
} from "./auth.types";

export async function loginWithGoogle(payload: GoogleLoginPayload): Promise<AuthResponseDto> {
  const { data } = await apiClient.post<AuthResponseDto>("/auth/login", payload);
  setSession(data.token, data.organizer);
  return data;
}

export async function signupWithGoogle(payload: GoogleLoginPayload): Promise<AuthResponseDto> {
  const { data } = await apiClient.post<AuthResponseDto>("/auth/signup", payload);
  setSession(data.token, data.organizer);
  return data;
}

// Convenience auth by email only — no password, no verification. Works in every
// environment now that the Development-only gate has been removed on the backend.
export async function loginWithEmail(payload: EmailLoginPayload): Promise<AuthResponseDto> {
  const { data } = await apiClient.post<AuthResponseDto>("/auth/email-login", payload);
  setSession(data.token, data.organizer);
  return data;
}

export async function signupWithEmail(payload: EmailSignupPayload): Promise<AuthResponseDto> {
  const { data } = await apiClient.post<AuthResponseDto>("/auth/email-signup", payload);
  setSession(data.token, data.organizer);
  return data;
}

export async function getCurrentOrganizer(): Promise<OrganizerDto> {
  const { data } = await apiClient.get<OrganizerDto>("/auth/me");
  return data;
}

/**
 * Decodes the JWT credential returned by Google Identity Services in the browser.
 * This does NOT verify the signature — only use it against Google's own credential response.
 */
export function decodeGoogleCredential(credential: string): GoogleLoginPayload {
  const payloadSegment = credential.split(".")[1];
  const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const payload = JSON.parse(atob(padded));

  return {
    userId: payload.sub,
    email: payload.email,
    fullName: payload.name,
  };
}