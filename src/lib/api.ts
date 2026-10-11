import { createClient } from '@supabase/supabase-js'
import type { CambiosAuditoria, CambiosPendiente, Datos } from './tipos.ts'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const configurado = Boolean(URL && ANON)

// Supabase solo se usa para el login (enlace mágico) y para invocar la función.
export const supabase = createClient(URL ?? 'http://localhost', ANON ?? 'falta-configurar', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

async function llamar<T>(cuerpo: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('paperflow', { body: cuerpo })
  if (error) {
    // El cuerpo del error trae el mensaje legible de la función.
    let mensaje = 'No se pudo conectar con Paperflow'
    try {
      const ctx = (error as { context?: Response }).context
      const j = ctx ? await ctx.json() : null
      if (j?.error) mensaje = j.error
    } catch {
      /* se queda el mensaje genérico */
    }
    throw new Error(mensaje)
  }
  return data as T
}

export const leer = (fresco = false) => llamar<Datos>({ accion: 'leer', fresco })

export const actualizarPendiente = (id: string, cambios: CambiosPendiente) =>
  llamar<{ ok: true }>({ accion: 'actualizarPendiente', id, cambios })

export const actualizarAuditoria = (id: string, cambios: CambiosAuditoria) =>
  llamar<{ ok: true }>({ accion: 'actualizarAuditoria', id, cambios })

// Última lectura buena, para no mostrar nunca una pantalla vacía si Notion no responde.
const CLAVE = 'paperflow:ultima-lectura'
export function guardarCopia(d: Datos) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(d))
  } catch {
    /* almacenamiento no disponible: se sigue sin copia */
  }
}
export function leerCopia(): Datos | null {
  try {
    const t = localStorage.getItem(CLAVE)
    return t ? (JSON.parse(t) as Datos) : null
  } catch {
    return null
  }
}
