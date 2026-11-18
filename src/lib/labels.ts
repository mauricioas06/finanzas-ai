/** Nombres en español para los valores internos de la base. */

export const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  debito: "Débito",
  ahorro: "Ahorro",
  cartera_digital: "Cartera digital",
  otro: "Otro",
};

export const INCOME_TYPE_LABEL: Record<string, string> = {
  sueldo: "Sueldo",
  bono: "Bono",
  comision: "Comisión",
  trabajo_adicional: "Trabajo adicional",
  negocio: "Negocio",
  extraordinario: "Extraordinario",
  otro: "Otro",
};

export const FREQUENCY_LABEL: Record<string, string> = {
  unica: "Única vez",
  semanal: "Semanal",
  quincenal: "Quincenal",
  mensual: "Mensual",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  anual: "Anual",
  variable: "Variable",
};

export function label(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return "—";
  return map[key] ?? key;
}
