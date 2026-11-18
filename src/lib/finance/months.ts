/** Meses como texto "YYYY-MM". Sin objetos Date para no moverse de día por la zona horaria. */

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function monthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Primer y último día del mes, y primer día del siguiente (para filtros "< next"). */
export function monthRange(key: string): { start: string; end: string; next: string } {
  return {
    start: `${key}-01`,
    end: `${key}-${String(daysInMonth(key)).padStart(2, "0")}`,
    next: `${shiftMonth(key, 1)}-01`,
  };
}

/** Los últimos n meses terminando en `key`, del más antiguo al más reciente. */
export function lastMonths(key: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => shiftMonth(key, i - (n - 1)));
}

export function monthLabel(key: string, short = false): string {
  const [y, m] = key.split("-").map(Number);
  const name = MONTH_NAMES[m - 1];
  return short ? `${name.slice(0, 3)} ${String(y).slice(2)}` : `${name} ${y}`;
}

/** "1 año 3 meses", "8 meses". */
export function formatDuration(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y) parts.push(`${y} año${y === 1 ? "" : "s"}`);
  if (m || !y) parts.push(`${m} mes${m === 1 ? "" : "es"}`);
  return parts.join(" ");
}

/** Días de diferencia entre dos fechas ISO (b - a). */
export function daysBetween(a: string, b: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}
