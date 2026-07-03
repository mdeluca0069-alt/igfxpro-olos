/**
 * Cached Intl formatters — creating Intl.NumberFormat is expensive (~40μs each).
 * Re-use formatters across all renders.
 */

const cache = new Map<string, Intl.NumberFormat>();

function fmt(opts: Intl.NumberFormatOptions, locale = "en-US"): Intl.NumberFormat {
  const key = `${locale}:${JSON.stringify(opts)}`;
  if (!cache.has(key)) cache.set(key, new Intl.NumberFormat(locale, opts));
  return cache.get(key)!;
}

/** Format a monetary value with currency symbol */
export function money(value: number, currency = "USD"): string {
  return fmt({ style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

/** Format a monetary value with 2 decimal places */
export function money2(value: number, currency = "USD"): string {
  return fmt({ style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

/** Format a number with configurable decimal places */
export function number(value: number, digits = 2): string {
  return fmt({ maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}

/** Format a price with instrument-appropriate precision */
export function price(value: number, symbol: string): string {
  const digits = priceDigits(symbol);
  return fmt({ minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

/** Return the number of decimal digits for an instrument's price */
export function priceDigits(symbol: string): number {
  if (symbol.includes("JPY"))  return 3;
  if (symbol.includes("BTC") || symbol.includes("ETH")) return 2;
  if (symbol.startsWith("US") || symbol.startsWith("DE") || symbol.startsWith("UK")) return 2;
  if (symbol.includes("XAU") || symbol.includes("WTI") || symbol.includes("BRENT")) return 2;
  return 5;
}

/** Format a percentage with sign */
export function pct(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${fmt({ maximumFractionDigits: digits }).format(value)}%`;
}

/** Format event countdown seconds as "Xh Ym" */
export function countdown(seconds: number): string {
  const safe    = Math.max(0, Math.floor(seconds));
  const hours   = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${safe}s`;
}

/** Format bytes for display */
export function bytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 ** 2).toFixed(1)} MB`;
}

/** Format a date as local short string */
export function dateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { day: "2-digit", month: "short" });
}

/** Format a date + time */
export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

/** Coerce Prisma Decimal (serialized as string) → number. Returns 0 on NaN/null/undefined. */
export function toN(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
