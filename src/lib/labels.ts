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

export const DEBT_TYPE_LABEL: Record<string, string> = {
  tarjeta_credito: "Tarjeta de crédito",
  prestamo_personal: "Préstamo personal",
  financiamiento: "Financiamiento",
  deuda_personal: "Deuda personal",
  credito_automotriz: "Crédito automotriz",
  hipotecario: "Crédito hipotecario",
  otra: "Otra",
};

export const DEBT_MOVEMENT_LABEL: Record<string, string> = {
  abono: "Pago",
  compra: "Compra",
  interes: "Interés",
  comision: "Comisión",
  ajuste: "Ajuste",
};

export const PAYMENT_STATE_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  parcial: "Pago parcial",
  pagado: "Pagado",
  vencido: "Vencido",
};

export function label(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return "—";
  return map[key] ?? key;
}
