/**
 * Variables públicas de Supabase. La llave "publishable" es pública por
 * diseño: la protección real de los datos la da Row Level Security.
 * Las llaves secretas (service role, IA, datos de mercado) se leen solo en
 * archivos con "server-only" y nunca llevan el prefijo NEXT_PUBLIC_.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return supabaseUrl.startsWith("https://") && supabasePublishableKey.length > 20;
}
