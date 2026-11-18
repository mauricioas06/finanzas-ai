# Publicar FINANZAS AI en internet

Objetivo: una dirección como `https://finanzas-ai.vercel.app` que puedas compartir con amigos y familia.

| Pieza | Servicio | Estado |
|---|---|---|
| Base de datos y cuentas de usuario | Supabase | ✅ Lista (proyecto `finanzas-ai`) |
| Código | GitHub | ✅ `mauricioas06/finanzas-ai` (privado) |
| Página web | Vercel | ✅ https://finanzas-ai-seven.vercel.app |

Estado al 18/11/2026: todo publicado y probado con un registro real. Los pasos siguientes quedan
como referencia por si hay que repetirlos.

## Paso 1. Crear las cuentas (lo haces tú)

1. Entra a https://github.com/signup y crea una cuenta.
2. Entra a https://vercel.com/signup, elige **Hobby** y luego **Continue with GitHub**.

## Paso 2. Subir el código a GitHub

Claude lo prepara contigo cuando tengas la cuenta: se crea un repositorio **privado** y se sube el código.
El archivo `.env.local` nunca se sube.

## Paso 3. Conectar Vercel

1. En Vercel: **Add New → Project** y elige el repositorio `FINANZAS-AI`.
2. En **Environment Variables** agrega las dos variables de `.env.local`:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Presiona **Deploy**. En 2 o 3 minutos tendrás tu dirección.

Cada vez que se suba código nuevo a GitHub, Vercel actualiza la página solo.

## Paso 4. Decirle a Supabase cuál es tu dirección

Sin esto, los enlaces de confirmación de correo apuntan a `localhost` y no funcionan para tus invitados.

1. Abre https://supabase.com/dashboard/project/kfyivzaesnkwbvixlfyu/auth/url-configuration
2. **Site URL**: tu dirección de Vercel, por ejemplo `https://finanzas-ai.vercel.app`
3. **Redirect URLs**: agrega `https://finanzas-ai.vercel.app/**` y `http://localhost:3000/**`
4. Guarda.

## Importante: límite de correos

El servicio de correo incluido en Supabase gratis solo envía **unos pocos correos por hora**. Si varios
amigos se registran el mismo día, algunos no recibirán el correo de confirmación. Dos opciones:

* **Para empezar (rápido):** en https://supabase.com/dashboard/project/kfyivzaesnkwbvixlfyu/auth/providers
  abre **Email** y apaga **Confirm email**. La gente entra sin confirmar el correo.
  Desventaja: alguien podría registrarse con un correo que no es suyo.
* **Recomendado al crecer:** conectar un servicio de correo gratuito (por ejemplo Resend, 3,000 correos al mes)
  en **Authentication → Emails → SMTP Settings**. Se prepara en la Fase 8.

La app funciona con cualquiera de las dos: si no se exige confirmación, entra directo al dashboard.
