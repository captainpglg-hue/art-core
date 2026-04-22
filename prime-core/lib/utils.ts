import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPoints(points: number): string {
  if (points >= 1_000_000) return `${(points / 1_000_000).toFixed(1)}M`;
  if (points >= 1_000) return `${(points / 1_000).toFixed(1)}K`;
  return points.toLocaleString("fr-FR");
}

export function formatPrice(
  amount: number,
  currency: string = "EUR",
  locale: string = "fr-FR"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateOdds(yesPool: number, noPool: number) {
  const total = yesPool + noPool;
  if (total === 0) return { yesPct: 50, noPct: 50, yesOdds: 2.0, noOdds: 2.0 };

  const yesPct = Math.round((yesPool / total) * 100);
  const noPct = 100 - yesPct;

  const yesOdds = yesPool > 0 ? total / yesPool : 0;
  const noOdds = noPool > 0 ? total / noPool : 0;

  return { yesPct, noPct, yesOdds: +yesOdds.toFixed(2), noOdds: +noOdds.toFixed(2) };
}

export function timeRemaining(closesAt: string): string {
  const now = new Date();
  const closes = new Date(closesAt);
  const diff = closes.getTime() - now.getTime();

  if (diff <= 0) return "Clos";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}j ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatDate(date: string | Date, locale: string = "fr-FR"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}
