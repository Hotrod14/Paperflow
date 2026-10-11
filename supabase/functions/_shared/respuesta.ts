import { corsHeadersPara } from './cors.ts'

export class ErrorHttp extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersPara(req), 'Content-Type': 'application/json' },
  })
}

/** Errores conocidos se devuelven tal cual; el resto, genérico (sin filtrar detalles de Notion). */
export function errorARespuesta(req: Request, err: unknown) {
  if (err instanceof ErrorHttp) return json(req, { error: err.message }, err.status)
  console.error(err)
  return json(req, { error: 'Error interno. Intenta nuevamente.' }, 500)
}

export function preflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersPara(req) })
  if (req.method !== 'POST') return json(req, { error: 'Método no permitido' }, 405)
  return null
}
