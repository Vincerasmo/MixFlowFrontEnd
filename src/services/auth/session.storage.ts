import type { OrganizerDto } from "./auth.types";

const TOKEN_KEY = "mixflow.token";
const ORGANIZER_KEY = "mixflow.organizer";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, organizer: OrganizerDto) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ORGANIZER_KEY, JSON.stringify(organizer));
}

export function getStoredOrganizer(): OrganizerDto | null {
  const raw = localStorage.getItem(ORGANIZER_KEY);
  return raw ? (JSON.parse(raw) as OrganizerDto) : null;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ORGANIZER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}