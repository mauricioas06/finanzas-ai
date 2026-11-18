import { Alert, Card } from "./ui";

/** Se muestra si faltan las variables de Supabase, en lugar de fallar en silencio. */
export function ConfigMissing() {
  return (
    <Card className="p-7">
      <h1 className="text-xl font-semibold">Falta conectar la base de datos</h1>
      <div className="mt-4">
        <Alert tone="info">
          Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en el archivo .env.local
          (o en las variables de entorno de Vercel) y reinicia la aplicación.
        </Alert>
      </div>
    </Card>
  );
}
