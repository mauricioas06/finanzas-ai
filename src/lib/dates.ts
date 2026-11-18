/** Fechas en formato mexicano (DD/MM/YYYY) y zona America/Mexico_City. */
export const TIME_ZONE = "America/Mexico_City";

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/**
 * Formatea una fecha. Las fechas puras de la base ("2026-11-18") se toman
 * tal cual, sin conversión de zona, para no recorrerlas un día.
 */
export function formatDate(value: string | Date): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  return dateFmt.format(typeof value === "string" ? new Date(value) : value);
}

/** Fecha de hoy en la Ciudad de México como "YYYY-MM-DD". */
export function todayInMexico(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Saludo según la hora en la Ciudad de México. */
export function greeting(now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(now),
  );
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}
