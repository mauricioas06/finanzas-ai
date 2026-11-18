# Progreso de FINANZAS AI

Fuente de verdad para retomar el trabajo. Se actualiza al cerrar cada fase.

## Fase 1 — Arquitectura, base de datos y autenticación (18/11/2026)

**Construido**

* Documento de arquitectura, modelo de datos, costos, roadmap y riesgos (`docs/00_ARQUITECTURA_Y_PLAN.md`).
* Proyecto Next.js 16 + React 19 + TypeScript + Tailwind 4, modo oscuro por defecto y modo claro opcional.
* Proyecto de Supabase `finanzas-ai` (plan gratuito, región us-east-1, id `kfyivzaesnkwbvixlfyu`).
* 7 migraciones con 31 tablas: las 23 pedidas más `subscriptions`, `plan_limits`, `usage_events`,
  `money_accounts`, `recurring_expenses`, `bucket_movements`, `income_allocation_items` y `audit_log`.
* Row Level Security en todas las tablas, llaves foráneas compuestas, auditoría automática.
* Registro, inicio y cierre de sesión, confirmación por correo, protección de rutas.
* Menú lateral con los 13 módulos. Los que aún no existen dicen claramente en qué fase llegan.
* Configuración del perfil financiero (funcional y guardada en la base).
* Página pública de inicio y aviso de privacidad.

**Pruebas**

* Supabase real: 7 migraciones aplicadas sin error; asesor de seguridad sin observaciones.
* Supabase real: prueba de extremo a extremo dentro de una transacción que se deshace
  (alta de usuario, perfil, plan gratuito, 9 categorías, aislamiento entre usuarios).
* Pruebas automáticas locales (`npm test`): 24 de 24 pasan. Incluyen aislamiento entre usuarios,
  bloqueo de cambios de plan, columnas protegidas del perfil, reglas de corte y pago mínimo,
  precisión decimal, auditoría, formato MXN y fechas en hora de la Ciudad de México.
* `npm run typecheck`, `npm run lint` y `npm run build`: sin errores.

**En línea**

* Página pública: https://finanzas-ai-seven.vercel.app (Vercel, proyecto en el equipo "Mau Proyectos").
* Código: https://github.com/mauricioas06/finanzas-ai (privado). Cada `git push` a `main` vuelve a publicar.
* Supabase Auth: Site URL y Redirect URLs apuntan a la página de Vercel y a localhost.
* Probado en línea el 18/11/2026: registro real, correo de confirmación, entrada al dashboard;
  la base creó perfil, plan gratuito, aceptación de privacidad y 9 categorías.

**Pendiente**

* Correo propio (SMTP, por ejemplo Resend) para no depender del límite de envíos de Supabase gratis (Fase 8).

## Fase 2 — Dashboard, Mi dinero, ingresos y gastos (18/11/2026)

**Construido**

* Migración 0008: el saldo de cada cuenta se ajusta solo con ingresos y gastos (y se revierte al
  borrar o corregir); la base rechaza gastos mayores al saldo de la cuenta; vistas de resumen mensual
  `v_monthly_cashflow` y `v_monthly_category_spend` (respetan RLS); función atómica
  `pay_recurring_expense` y cálculo de próxima fecha (`next_due_date`, quincenas 15 y fin de mes).
* **Mi dinero:** alta de cuentas, saldo real, ajuste de saldo, eliminación con confirmación, dona de distribución.
* **Ingresos:** registrar ingreso (tipo, fuente, cuenta), fuentes de ingreso (fijas o variables, días de pago),
  historial por mes, total por fuente, comparación con el mes anterior.
* **Gastos:** registrar gasto con categoría y cuenta; categorías configurables con presupuesto mensual;
  alertas (80 % = aviso, más de 100 % = excedido); detección de gasto inusual (1.5 veces el promedio de
  los 3 meses anteriores y al menos $200 de diferencia); comparación mensual; gastos recurrentes con
  "Registrar pago"; historial; gráfica por categoría.
* **Dashboard real:** dinero disponible, comprometido (recurrentes pendientes del mes), ingresos, gastos,
  balance del mes y patrimonio neto (por ahora solo cuentas); gráficas de ingresos vs. gastos (6 meses),
  distribución del dinero y gastos por categoría; "¿Qué debo hacer hoy?" con acciones reales priorizadas.
* Montos leídos como texto exacto (`::text`) y escritos como texto; cálculos con decimal.js.

**Pruebas**

* `npm test`: 51 de 51 (nuevas: saldos automáticos, sobregiro bloqueado, resúmenes, próxima fecha,
  pago recurrente atómico y aislado entre usuarios, presupuestos, gasto inusual, acciones del día, validaciones).
* Supabase real, en transacción que se deshace: saldo 9,001.20 exacto, gasto del mes 499.30, próxima
  fecha 20/12/2026, sobregiro bloqueado.
* `typecheck`, `lint`, `build`: sin errores.

* Prueba del usuario en línea (18/11/2026): cuenta, ingreso, gasto, presupuesto y dashboard
  funcionaron como se esperaba.

**Pendiente para fases siguientes**

* Gastos pagados con tarjeta de crédito → Fase 3 (deudas).
* Gráficas de evolución del patrimonio, deudas, metas y portafolio → Fases 3, 5 y 6.
* "Leaked password protection" de Supabase Auth (asesor de seguridad) → revisar en Fase 8.

## Fase 3 — Deudas, tarjetas y calendario (18/11/2026)

**Decisión clave:** pagar una tarjeta o préstamo es un movimiento `pago_deuda`: sale dinero de la
cuenta pero **no** cuenta como gasto, porque el gasto ya se contó al comprar. Así nada se cuenta dos veces.

**Construido**

* Migración 0009: tipo `pago_deuda`; saldo de cada deuda ajustado solo por sus movimientos (abono baja;
  compra, interés y comisión suben; ajuste ±); estado `liquidada` automático al llegar a cero; borrar un
  pago o compra revierte también la deuda; funciones atómicas `pay_debt` y `card_purchase`; alertas
  `sync_payment_alerts` (7, 3 y 1 día antes y el día del vencimiento; una sola vez por umbral).
* **Deudas:** alta de tarjetas (límite, día de corte, día límite) y préstamos (pago fijo, día de pago);
  resumen, uso de crédito, próximo pago por deuda; comparación **solo mínimos / avalancha / bola de nieve**
  con meses para liquidar, intereses totales, orden y cuánto separar por quincena.
* **Detalle de deuda:** estados de cuenta (fecha de corte ≠ fecha límite; pago mínimo ≠ pago para no generar
  intereses) con fechas sugeridas que el usuario confirma; registrar pago (desde una cuenta y a un estado de
  cuenta), compra con tarjeta, interés o comisión, corregir saldo, historial y borrado con confirmación.
* **Gastos:** ahora se puede pagar con tarjeta de crédito (sube su deuda y cuenta como gasto).
* **Calendario:** cuadrícula mensual (agenda en teléfono) con cortes, fechas límite, préstamos, recurrentes e
  ingresos previstos; fechas estimadas marcadas con borde punteado y sin montos inventados; panel
  **PRÓXIMOS PAGOS** (deuda, institución, importe, fecha límite, estado: pendiente, parcial, pagado, vencido);
  panel de alertas con "marcar como leídas"; campana con contador en la barra superior.
* **Dashboard:** deudas pendientes, patrimonio neto real (cuentas − deudas), comprometido con pagos de deudas,
  pagos a deudas aparte de los gastos, gráfica de evolución de las deudas y acciones del día con pagos de
  tarjetas (pago sin intereses y mínimo) y aviso para capturar estados de cuenta.

**Pruebas**

* `npm test`: 88 de 88 (nuevas: estrategias, fechas de corte y límite, estados de pago, próximos pagos,
  calendario, cuánto separar por quincena, pagos y compras atómicos, sobrepago bloqueado, alertas
  idempotentes y aisladas, notificaciones de solo lectura).
* Supabase real (transacción que se deshace): deuda 3,200.25; cuenta 9,700.00; gasto del mes solo la compra
  (500.25); pago a deuda aparte (300.00); pagar el mínimo no marca el estado como pagado; sobrepago bloqueado;
  alerta "En 2 días vence" creada una sola vez.
* `typecheck`, `lint`, `build`: sin errores.

**Notas**

* El asesor de Supabase avisa que `sync_payment_alerts` es SECURITY DEFINER ejecutable por usuarios. Es
  intencional: no recibe parámetros y solo crea alertas para quien la llama a partir de sus propios datos.
* El estado "Dinero apartado" de Próximos pagos llega con los apartados (Fase 4). Avisos por correo: Fase 8.

**Siguiente:** Fase 4 ("RECIBÍ DINERO", motor de distribución y apartados).
