/**
 * Menú lateral. "phase" indica en qué fase del roadmap queda funcional cada
 * módulo; mientras no llega, la página lo dice claramente (sin datos falsos).
 */
export type NavIcon =
  | "dashboard" | "wallet" | "income" | "expenses" | "debts" | "payday" | "buckets"
  | "investments" | "radar" | "cfo" | "calendar" | "reports" | "settings";

export interface NavItem {
  slug: string;
  href: string;
  label: string;
  icon: NavIcon;
  phase: number;
  description: string;
  features: string[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    slug: "dashboard", href: "/dashboard", label: "Dashboard", icon: "dashboard", phase: 2,
    description: "Tu situación financiera de un vistazo y lo que debes hacer hoy.",
    features: ["Dinero disponible, comprometido y apartado", "Ingresos y gastos del mes", "Patrimonio neto y gráficas"],
  },
  {
    slug: "mi-dinero", href: "/mi-dinero", label: "Mi dinero", icon: "wallet", phase: 2,
    description: "Tus cuentas de efectivo, débito y ahorro, y cuánto hay en cada una.",
    features: ["Registrar cuentas y saldos", "Dinero libre contra dinero apartado", "Historial de ajustes"],
  },
  {
    slug: "ingresos", href: "/ingresos", label: "Ingresos", icon: "income", phase: 2,
    description: "Sueldo, bonos, comisiones, negocios y cualquier otro ingreso.",
    features: ["Ingresos semanales, quincenales y mensuales", "Ingresos variables sin suponer montos", "Historial por fuente"],
  },
  {
    slug: "gastos", href: "/gastos", label: "Gastos", icon: "expenses", phase: 2,
    description: "Gastos únicos y recurrentes con presupuesto por categoría.",
    features: ["Categorías configurables", "Presupuestos y alertas", "Comparación entre meses"],
  },
  {
    slug: "deudas", href: "/deudas", label: "Deudas", icon: "debts", phase: 3,
    description: "Tarjetas, préstamos y financiamientos con sus fechas reales.",
    features: ["Fecha de corte y fecha límite por separado", "Pago mínimo y pago para no generar intereses", "Bola de nieve y avalancha"],
  },
  {
    slug: "mi-quincena", href: "/mi-quincena", label: "Mi quincena", icon: "payday", phase: 4,
    description: "El botón RECIBÍ DINERO: qué hacer con cada peso que entra.",
    features: ["Propuesta de distribución adaptada a ti", "Aceptar, modificar o rechazar cada renglón", "Nunca se asigna dos veces el mismo dinero"],
  },
  {
    slug: "apartados", href: "/apartados", label: "Apartados y metas", icon: "buckets", phase: 4,
    description: "Sobres virtuales para emergencias, viajes, auto y tus metas.",
    features: ["Aportación recomendada por quincena", "Progreso y fecha estimada", "Historial de aportaciones"],
  },
  {
    slug: "inversiones", href: "/inversiones", label: "Inversiones", icon: "investments", phase: 6,
    description: "Tu portafolio en GBM, CETES, SOFIPOs, FIBRAs y más, registrado a mano.",
    features: ["Rendimiento y ganancia o pérdida", "Diversificación y concentración", "Evolución histórica"],
  },
  {
    slug: "radar", href: "/radar", label: "Investment Radar", icon: "radar", phase: 6,
    description: "Investigación de mercados con noticias, fundamentales y análisis técnico.",
    features: ["Ranking explicable de 0 a 100", "Noticias corroboradas con fuente y fecha", "Comparación con CETES y SOFIPOs"],
  },
  {
    slug: "cfo", href: "/cfo", label: "CFO con IA", icon: "cfo", phase: 7,
    description: "Pregúntale a tu CFO con base en tus datos reales.",
    features: ["¿Cuánto puedo gastar hoy?", "¿Qué deuda liquido primero?", "¿Cuánto puedo invertir?"],
  },
  {
    slug: "calendario", href: "/calendario", label: "Calendario", icon: "calendar", phase: 3,
    description: "Fechas de corte, pagos, servicios e ingresos previstos.",
    features: ["Panel de próximos pagos", "Alertas 7, 3 y 1 día antes", "Estados: pendiente, apartado, pagado, vencido"],
  },
  {
    slug: "reportes", href: "/reportes", label: "Reportes", icon: "reports", phase: 5,
    description: "Reportes semanales, mensuales y anuales con proyecciones.",
    features: ["Patrimonio a 1, 3, 5 y 10 años", "Exportar a PDF y Excel", "Ahorro y deudas en el tiempo"],
  },
  {
    slug: "configuracion", href: "/configuracion", label: "Configuración", icon: "settings", phase: 1,
    description: "Tu perfil, preferencias y plan.",
    features: [],
  },
];

export function findNavItem(slug: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.slug === slug);
}
