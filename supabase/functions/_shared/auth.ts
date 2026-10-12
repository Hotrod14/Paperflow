// Paperflow tiene un solo usuario. La función valida la sesión contra
// Supabase Auth (getUser) y confirma que el correo sea ALLOWED_EMAIL.
// verify_jwt va en false en config.toml porque los proyectos nuevos usan
// claves de firma asimétricas; la validación real ocurre aquí.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { ErrorHttp } from './respuesta.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
// Proyectos con claves legacy exponen SUPABASE_ANON_KEY; los nuevos, SUPABASE_PUBLISHABLE_KEYS (JSON).
function clavePublica(): string {
  const legacy = Deno.env.get('SUPABASE_ANON_KEY')
  if (legacy) return legacy
  try {
    const claves = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}') as Record<string, string>
    const primera = claves.default ?? Object.values(claves)[0]
    if (primera) return primera
  } catch {
    /* sigue al error */
  }
  throw new ErrorHttp('Falta la clave pública de Supabase en la función', 500)
}
const ALLOWED_EMAIL = (Deno.env.get('ALLOWED_EMAIL') ?? '').trim().toLowerCase()

export async function exigirUsuario(req: Request): Promise<string> {
  if (!ALLOWED_EMAIL) throw new ErrorHttp('Falta configurar ALLOWED_EMAIL', 500)
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) throw new ErrorHttp('Sesión requerida', 401)

  const cliente = createClient(SUPABASE_URL, clavePublica(), { auth: { persistSession: false } })
  const { data, error } = await cliente.auth.getUser(token)
  const email = data?.user?.email?.toLowerCase()
  if (error || !email) throw new ErrorHttp('Sesión inválida', 401)
  if (email !== ALLOWED_EMAIL) throw new ErrorHttp('Este correo no tiene acceso', 403)
  return email
}
