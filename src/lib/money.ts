import Decimal from "decimal.js";

/**
 * Dinero con precisión decimal. Regla del proyecto: ningún cálculo de dinero
 * usa números de punto flotante; todo pasa por Decimal y se redondea a
 * centavos con redondeo bancario (half-even) solo al final.
 */
Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_EVEN });

export type MoneyInput = Decimal.Value;

export function money(value: MoneyInput): Decimal {
  const d = new Decimal(value);
  if (!d.isFinite()) throw new Error("Monto inválido");
  return d;
}

/** Redondea a centavos y devuelve texto apto para PostgreSQL numeric. */
export function toDbAmount(value: MoneyInput): string {
  return money(value).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toFixed(2);
}

export function sum(values: MoneyInput[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(money(v)), new Decimal(0));
}

/**
 * Convierte lo que escribe el usuario ("$1,234.50", "1234.5") en Decimal.
 * Acepta comas de miles y punto decimal (formato México). Devuelve null si
 * el texto no es un monto válido o tiene más de dos decimales.
 */
export function parseMoneyInput(raw: string): Decimal | null {
  const cleaned = raw.trim().replace(/^\$/, "").replace(/\s/g, "");
  if (!/^-?(\d{1,3}(,\d{3})+|\d+)(\.\d{1,2})?$/.test(cleaned)) return null;
  return money(cleaned.replace(/,/g, ""));
}

const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formato $1,234.56. Intl recibe el texto ya redondeado, no un float calculado. */
export function formatMXN(value: MoneyInput): string {
  const rounded = money(value).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
  return mxn.format(rounded.toFixed(2) as unknown as number);
}
