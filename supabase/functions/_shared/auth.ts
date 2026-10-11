// Paperflow tiene un solo usuario. Además del JWT de Supabase
// (verify_jwt = true en config.toml), cada función confirma que el
// correo de la sesión es el autorizado (ALLOWED_EMAIL).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { ErrorHttp } from './respuesta.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const ALLOWED_EMAIL = (Deno.env.get('ALLOWED_EMAIL') ?? '').trim().toLowerCase()

export async function exigirUsuario(req: Request): Promise<string> {
  if (!ALLOWED_EMAIL) throw new ErrorHttp('Falta configurar ALLOWED_EMAIL', 500)
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) throw new ErrorHttp('Sesión requerida', 401)

  const cliente = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data, error } = await cliente.auth.getUser(token)
  const email = data?.user?.email?.toLowerCase()
  if (error || !email) throw new ErrorHttp('Sesión inválida', 401)
  if (email !== ALLOWED_EMAIL) throw new ErrorHttp('Este correo no tiene acceso', 403)
  return email
}
