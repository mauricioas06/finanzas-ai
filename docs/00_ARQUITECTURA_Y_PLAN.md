# FINANZAS AI — Análisis, arquitectura y plan de trabajo

Fecha: 18/11/2026. Documento vivo: se actualiza al cerrar cada fase.

## 1. Análisis de requerimientos

FINANZAS AI es un **CFO personal**: no solo muestra datos, convierte la situación
financiera del usuario en instrucciones concretas ("aparta $2,500 para la tarjeta
antes del 05/12"). Del documento maestro salen cinco ideas que guían todo:

| Idea central | Consecuencia técnica |
|---|---|
| Cada peso se asigna una sola vez | Libro de movimientos de apartados y una regla en la base de datos que impide asignar más dinero del que existe |
| La IA no inventa cifras | La IA solo lee datos mediante funciones del servidor; los cálculos los hace código determinista, no el modelo |
| Corte ≠ límite de pago; mínimo ≠ pago sin intereses | Tabla `billing_cycles` con columnas separadas y restricciones (fecha límite posterior al corte, pago mínimo ≤ pago sin intereses) |
| Datos ajenos no son instrucciones | Noticias y documentos externos se guardan como texto "no confiable" y se pasan a la IA como datos, nunca como órdenes |
| Precisión decimal | `numeric` en PostgreSQL y `decimal.js` en TypeScript; nunca números de punto flotante para dinero |

Configuración regional fija para el MVP: español, MXN, DD/MM/YYYY, zona
`America/Mexico_City`, mercados de México y EE. UU.

## 2. Arquitectura técnica

```
Navegador (Next.js / React, modo oscuro)
   │  solo usa la llave pública de Supabase
   ▼
Servidor Next.js (Server Components, Server Actions, Route Handlers)
   │  valida todo con Zod, calcula con decimal.js
   │  guarda las llaves secretas (IA, datos bursátiles) en variables de entorno
   ├──► Supabase Auth (sesión en cookies seguras)
   ├──► PostgreSQL de Supabase (RLS: cada usuario solo ve sus filas)
   ├──► Proveedor de IA (interfaz intercambiable)          ← Fase 7
   └──► Proveedores de mercado (FMP, Finnhub, Banxico...)   ← Fase 6
Tareas programadas (Vercel Cron o Supabase pg_cron)          ← Fases 3 y 6
   └──► alertas de pagos, precios y noticias
```

Decisiones clave:

1. **Monolito modular en Next.js.** Un solo proyecto, desplegado en Vercel, con
   carpetas por módulo. Es lo más barato y fácil de mantener; si un módulo crece
   (por ejemplo, el radar de inversiones) se puede separar después.
2. **El servidor es la única puerta.** El navegador nunca llama a la IA ni a los
   proveedores de mercado. Las llaves secretas viven en el servidor.
3. **Seguridad en dos capas.** Validación en el servidor + Row Level Security en
   la base. Aunque hubiera un error en el código, la base de datos no entrega
   filas de otro usuario.
4. **Llaves foráneas compuestas** `(id, user_id)`: impiden que un usuario ligue
   su gasto a la categoría de otra persona, aunque conozca su identificador.
5. **Motores deterministas + IA explicadora.** El motor de distribución, la
   bola de nieve, la avalancha y las proyecciones son funciones de TypeScript con
   pruebas. La IA explica, prioriza y conversa usando esos resultados.
6. **Agentes de IA especializados** (Fase 7): CFO, Deudas, Distribución,
   Investigación de inversiones, Noticias y Planificación. Cada uno tiene su
   propio prompt, una lista cerrada de herramientas (funciones de solo lectura) y
   un esquema Zod de salida. Ningún agente escribe en la base: propone, y el
   usuario acepta en la interfaz.
7. **Proveedores intercambiables.** Interfaces `AIProvider` y `MarketDataProvider`;
   si falta una llave, se usa un **modo demostración marcado en pantalla**.

## 3. Modelo de base de datos

Migraciones versionadas en `supabase/migrations/`. La tabla `users` es
`auth.users`, que administra Supabase; nuestras tablas cuelgan de ella.

| Grupo | Tablas | Notas |
|---|---|---|
| Usuario | `profiles`, `plan_limits`, `usage_events` | Perfil, plan (free/premium) y control de consumo |
| Dinero | `money_accounts` | Efectivo, débito, ahorro (saldos capturados a mano) |
| Ingresos y gastos | `income_sources`, `transactions`, `expense_categories`, `recurring_expenses` | Ingresos variables sin monto fijo (`expected_amount` vacío) |
| Deudas | `debts`, `credit_cards`, `billing_cycles`, `debt_payments` | `debt_payments.kind`: abono, compra, interés, comisión, ajuste |
| Apartados | `financial_buckets`, `bucket_movements`, `financial_goals` | Saldo del apartado = suma de sus movimientos (trigger) |
| Distribución | `income_allocations`, `income_allocation_items` | Propuesta → aceptada, modificada o rechazada por renglón |
| Inversiones | `investment_accounts`, `investment_positions`, `investment_transactions` | Registro manual (sin integraciones con brókers) |
| Mercado (global) | `market_assets`, `market_prices`, `financial_news`, `investment_analyses` | Lectura para usuarios; escritura solo del servidor |
| Recomendaciones | `investment_recommendations` | Por usuario, con fecha de los datos y aviso legal |
| IA | `ai_conversations`, `ai_messages` | Guarda tokens y costo por mensaje |
| Historial | `financial_snapshots`, `notifications`, `audit_log` | Fotos diarias del patrimonio; auditoría automática |

Reglas de RLS:

* Tablas personales: el usuario autenticado solo puede leer y escribir filas
  donde `user_id = auth.uid()`. El rol anónimo no tiene acceso.
* Tablas globales de mercado: lectura para usuarios autenticados; escritura
  solo con la llave de servicio del servidor.
* `audit_log` y `usage_events`: el usuario puede leer las suyas, nunca editarlas
  ni borrarlas.

Precisión: montos en `numeric(14,2)`, cantidades y precios de activos en
`numeric(24,8)`, tasas en `numeric(9,4)`.

## 4. Módulos

| # | Módulo (menú) | Fase |
|---|---|---|
| 1 | Dashboard y "¿Qué debo hacer hoy?" | 2 (se enriquece en cada fase) |
| 2 | Mi dinero (cuentas y saldos) | 2 |
| 3 | Ingresos | 2 |
| 4 | Gastos y presupuestos | 2 |
| 5 | Deudas y tarjetas | 3 |
| 6 | Mi quincena (botón "RECIBÍ DINERO") | 4 |
| 7 | Apartados y metas | 4 y 5 |
| 8 | Inversiones (portafolio manual) | 6 |
| 9 | Investment Radar | 6 |
| 10 | CFO con IA | 7 |
| 11 | Calendario y próximos pagos | 3 |
| 12 | Reportes y proyecciones | 5 |
| 13 | Configuración | 1 |

## 5. Herramientas seleccionadas

| Necesidad | Herramienta | Por qué |
|---|---|---|
| Aplicación web | Next.js 16 + React 19 + TypeScript | Pedido en el documento; un solo proyecto para frontend y backend |
| Estilos | Tailwind CSS 4 + componentes propios | Sin librerías de UI pesadas; diseño a medida |
| Gráficas | Recharts | Pedido en el documento (se instala en Fase 2) |
| Íconos | lucide-react | Ligero y libre |
| Base y sesión | Supabase (PostgreSQL + Auth + RLS) | El plan gratuito alcanza para el MVP |
| Validación | Zod | Valida formularios y salidas de la IA |
| Dinero | decimal.js | Aritmética decimal exacta |
| Pruebas | Vitest + PGlite | PGlite es PostgreSQL real dentro de Node: prueba migraciones y RLS sin Docker |
| Despliegue | Vercel (plan Hobby) | Gratis para uso personal |
| Exportar | Excel y PDF | Librerías a elegir en Fase 5 |

Proveedores de mercado (se evalúan con llamadas reales en Fase 6; las cifras son
aproximadas y deben verificarse antes de contratar):

| Proveedor | Plan gratuito aproximado | Fortaleza | Cuidado |
|---|---|---|---|
| Financial Modeling Prep | ~250 llamadas al día | Fundamentales de EE. UU. | Cobertura de la BMV limitada en el plan gratis |
| Finnhub | ~60 llamadas por minuto | Noticias y precios de EE. UU. | Mercados internacionales son de pago |
| Alpha Vantage | ~25 llamadas al día | Indicadores técnicos | Límite muy bajo |
| EODHD | ~20 llamadas al día; planes desde ~20 USD al mes | Cubre la Bolsa Mexicana | Casi todo es de pago |
| Banxico SIE | Gratis con token | CETES, tipo de cambio, tasa objetivo | Solo datos macroeconómicos |
| FRED (Reserva Federal de St. Louis) | Gratis con llave | Tasas e inflación de EE. UU. | Solo datos macroeconómicos |

Las licencias gratuitas suelen ser solo de uso personal. Para vender el SaaS
habrá que contratar un plan con derecho de redistribución.

## 6. Costos estimados

| Etapa | Concepto | Costo mensual aproximado |
|---|---|---|
| Desarrollo y uso personal | Supabase Free, Vercel Hobby, GitHub, Banxico, FRED | $0 |
| | IA con un modelo económico, ~300 consultas al mes | 1 a 5 USD |
| | Datos de mercado en planes gratuitos | $0 |
| Lanzamiento comercial | Supabase Pro | 25 USD |
| | Vercel Pro (uso comercial) | 20 USD |
| | Datos de mercado con licencia comercial | 30 a 100 USD |
| | IA con límites por usuario | 0.05 a 0.50 USD por usuario activo |

Control de costos: `usage_events` registra cada llamada a IA o a datos,
`plan_limits` define el tope mensual por plan, y los precios y noticias se
guardan en una caché compartida para no pedir lo mismo dos veces.

## 7. Roadmap

| Fase | Entregable | Criterio para cerrarla |
|---|---|---|
| 1 | Proyecto, base de datos completa, RLS, registro e inicio de sesión, menú, configuración de perfil | Compila, las pruebas de RLS pasan, se puede registrar e iniciar sesión |
| 2 | Dashboard real, Mi dinero, ingresos, gastos, categorías, presupuestos | Los totales del dashboard cuadran con las pruebas |
| 3 | Deudas, tarjetas, ciclos de facturación, calendario, próximos pagos, alertas | Corte, límite, mínimo y pago sin intereses separados y probados |
| 4 | "RECIBÍ DINERO", motor de distribución, apartados | Imposible asignar dos veces el mismo dinero (prueba en la base) |
| 5 | Metas, reportes, proyecciones a 1, 3, 5 y 10 años, PDF y Excel | Los reportes coinciden con los datos |
| 6 | Portafolio, proveedores de mercado, noticias, análisis técnico y fundamental, ranking 0–100 | Integraciones probadas con llamadas reales |
| 7 | CFO con IA y recomendaciones personalizadas | La IA responde solo con datos reales; salidas validadas |
| 8 | Auditoría de seguridad, pruebas de extremo a extremo, optimización, despliegue | Desplegado en Vercel con respaldos |

## 8. Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| La IA inventa saldos o fechas | Cálculos deterministas; la IA solo recibe resultados de funciones; validación con Zod; si falta un dato, debe decir que no lo tiene |
| Inyección de instrucciones desde noticias | Noticias marcadas como datos no confiables; los agentes no tienen herramientas de escritura |
| Errores de redondeo | `numeric` + `decimal.js`; pruebas con centavos |
| Fugas de datos entre usuarios | RLS + llaves foráneas compuestas + pruebas automáticas de aislamiento |
| Costos de IA o de datos fuera de control | Límites por plan, caché compartida, registro de consumo |
| Licencias de datos bursátiles | Revisar términos antes de vender; mostrar fuente y fecha de cada dato |
| Datos de BMV y BIVA escasos o caros | EODHD como candidato; si no hay dato, se dice claramente |
| Responsabilidad legal | Avisos visibles: no es asesoría financiera; la app nunca ejecuta operaciones |
| El plan gratuito de Supabase se pausa tras 7 días sin uso | Reactivar desde el panel; plan Pro al lanzar |
| El Node 18 instalado en la PC es viejo | Se usa Node 24 portátil (ver README) |
