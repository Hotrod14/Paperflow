// CORS restringido a los orígenes del frontend.
//
// ALLOWED_ORIGINS: lista separada por comas
// (ej. "https://paperflow.vercel.app,http://localhost:5173").
// CORS solo lo respetan los navegadores: la protección real es el JWT
// de Supabase + el correo autorizado (ver auth.ts).

const ORIGENES_PERMITIDOS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean)

export function corsHeadersPara(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const permitido = ORIGENES_PERMITIDOS.includes(origin) ? origin : ORIGENES_PERMITIDOS[0]
  return {
    'Access-Control-Allow-Origin': permitido,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}
