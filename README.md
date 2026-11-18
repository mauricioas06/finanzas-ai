# FINANZAS AI

Tu CFO personal: organiza tu dinero, controla tus deudas y te dice qué hacer con cada peso.
Hecho para México (español, MXN, DD/MM/AAAA, hora de la Ciudad de México).

> FINANZAS AI no es asesoría financiera y nunca ejecuta pagos, transferencias ni operaciones bursátiles.

## Estado por fases

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Arquitectura, base de datos, seguridad, registro e inicio de sesión, menú | ✅ Lista |
| 2 | Dashboard, Mi dinero, ingresos y gastos | ✅ Lista |
| 3 | Deudas, tarjetas y calendario | ✅ Lista |
| 4 | "RECIBÍ DINERO" y apartados | Pendiente |
| 5 | Metas y reportes | Pendiente |
| 6 | Investment Intelligence y datos de mercado | Pendiente |
| 7 | CFO con IA y recomendaciones | Pendiente |
| 8 | Seguridad final, pruebas y optimización | Pendiente |

Detalle: [docs/PROGRESO.md](docs/PROGRESO.md) · Arquitectura: [docs/00_ARQUITECTURA_Y_PLAN.md](docs/00_ARQUITECTURA_Y_PLAN.md)

## Cómo correrlo en tu PC (PowerShell)

Esta PC tiene Node 18, que es viejo. El proyecto usa un Node 24 portátil que no toca el sistema.
En cada ventana nueva de PowerShell, primero activa Node 24:

```powershell
$env:Path = "$env:LOCALAPPDATA\node-portable\node-v24.22.3-win-x64;$env:Path"
cd "$env:USERPROFILE\Documents\FINANZAS-AI"
```

Luego:

| Qué quieres hacer | Comando |
|---|---|
| Instalar dependencias (solo la primera vez) | `npm install` |
| Abrir la app en http://localhost:3000 | `npm run dev` |
| Correr todas las pruebas | `npm test` |
| Revisar errores de código | `npm run lint` y `npm run typecheck` |
| Compilar como en producción | `npm run build` |

## Qué hace cada carpeta

| Carpeta o archivo | Para qué sirve |
|---|---|
| `src/app/` | Páginas. `(auth)` = login y registro; `(app)` = zona privada con menú |
| `src/components/` | Piezas visuales reutilizables (tarjetas, botones, menú) |
| `src/lib/money.ts` | Dinero con precisión decimal (nunca float) |
| `src/lib/dates.ts` | Fechas DD/MM/AAAA en hora de la Ciudad de México |
| `src/lib/validation.ts` | Reglas que el servidor revisa antes de guardar |
| `src/lib/supabase/` | Conexión con la base de datos y la sesión |
| `src/proxy.ts` | Protege las páginas privadas y renueva la sesión |
| `supabase/migrations/` | Estructura de la base de datos, por versiones |
| `tests/` | Pruebas automáticas (incluye pruebas de seguridad entre usuarios) |
| `docs/` | Documentación del proyecto |
| `.env.local` | Datos de conexión (no se sube a GitHub) |
