import type { Metadata } from "next";
import { Logo } from "@/components/brand";

export const metadata: Metadata = { title: "Aviso de privacidad" };

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Logo />
      <article className="mt-10 space-y-5 text-sm leading-relaxed text-muted [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-fg">
        <h1 className="text-2xl font-semibold text-fg">Aviso de privacidad simplificado</h1>
        <p>Última actualización: 18/11/2026.</p>
        <p>
          FINANZAS AI es una aplicación en etapa de prueba que se comparte por invitación. Este aviso explica qué datos
          personales se usan y para qué, conforme a la Ley Federal de Protección de Datos Personales en Posesión de
          los Particulares.
        </p>

        <h2>Responsable</h2>
        <p>La persona que administra esta instancia de FINANZAS AI y que te compartió el enlace de acceso. Puedes contactarla directamente para cualquier solicitud sobre tus datos.</p>

        <h2>Datos que se recaban</h2>
        <p>
          Nombre, correo electrónico y la información financiera que tú decidas capturar: ingresos, gastos, saldos,
          deudas, metas e inversiones. <strong className="text-fg">Nunca</strong> se piden ni se guardan contraseñas bancarias,
          números completos de tarjeta, CVV ni NIP.
        </p>

        <h2>Para qué se usan</h2>
        <p>Únicamente para mostrarte tu información, calcular recomendaciones y enviarte avisos sobre tus pagos. No se venden ni se comparten con terceros con fines comerciales.</p>

        <h2>Dónde se guardan</h2>
        <p>
          En servidores de Supabase (base de datos) y Vercel (aplicación web), ubicados en Estados Unidos. Cada
          usuario solo puede ver su propia información; esto lo garantiza la base de datos con reglas de seguridad
          por fila. Cuando se activen las funciones de inteligencia artificial, solo se enviará al proveedor de IA la
          información necesaria para responder tu pregunta.
        </p>

        <h2>Tus derechos (ARCO)</h2>
        <p>Puedes pedir acceso, rectificación, cancelación u oposición al uso de tus datos, y solicitar que se borre tu cuenta con toda su información, contactando al responsable.</p>

        <h2>Aviso importante</h2>
        <p>FINANZAS AI no es asesoría financiera, fiscal ni de inversiones. Las recomendaciones no garantizan rendimientos. La aplicación nunca ejecuta pagos, transferencias ni operaciones bursátiles.</p>
      </article>
    </div>
  );
}
