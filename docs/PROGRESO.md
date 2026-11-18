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

**Siguiente:** Fase 2 (Dashboard real, Mi dinero, ingresos y gastos).
