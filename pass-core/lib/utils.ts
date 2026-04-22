import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, locale: string = "fr-FR"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function truncateHash(hash: string, chars: number = 8): string {
  if (hash.length <= chars * 2) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

/**
 * Parse the `photos` column into a string[] safely.
 *
 * The schema stores it as TEXT[] (postgres-js returns a JS array directly),
 * but older rows may still contain a JSON-encoded string. Callers must not
 * call JSON.parse blindly — that crashes when the value is already an array
 * ("22P02"-style malformed array errors on the client, or SyntaxError).
 */
export function parsePhotos(input: unknown): string[] {
  if (Array.isArray(input)) return input as string[];
  if (typeof input === "string" && input.length > 0) {
    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
