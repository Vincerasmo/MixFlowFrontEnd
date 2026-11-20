import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats an elapsed duration in a compact, human-readable form: "0m", "5m",
 * "1h", "1h 12m". Safe to call on freshly-created timestamps (returns "0m")
 * and on invalid/negative values (also "0m").
 */
export function formatElapsedDuration(startedAt: number, now: number): string {
  const totalMinutes = Math.floor((now - startedAt) / 60_000);
  if (totalMinutes <= 0) return "0m";
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

/**
 * Reads a `{ [id]: timestampMs }` map from localStorage, pruned to entries
 * less than 24h old. Anything older is a stale queue/match entry from a
 * previous session; keeping it around would only waste space.
 */
export function loadFirstSeenMap(storageKey: string): Map<number, number> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, number>;
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const result = new Map<number, number>();
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "number" && Number.isFinite(v) && v > cutoff) {
        result.set(Number(k), v);
      }
    }
    return result;
  } catch {
    return new Map();
  }
}

export function saveFirstSeenMap(storageKey: string, map: Map<number, number>): void {
  try {
    const obj: Record<string, number> = {};
    map.forEach((v, k) => { obj[String(k)] = v; });
    localStorage.setItem(storageKey, JSON.stringify(obj));
  } catch {
    // localStorage can be full, blocked, or in private mode — silently skip.
    // The in-memory timer still works; it just won't survive a refresh.
  }
}