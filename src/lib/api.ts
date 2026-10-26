import { createClient } from '@supabase/supabase-js'
import type { Ambito, CambiosAuditoria, CambiosNota, CambiosPendiente, Datos, Nota, TareaSuelta } from './tipos.ts'

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

export const crearTarea = (nueva: { titulo: string; proyecto: string; ambito: Ambito; nota?: string; enFoco?: string | null }) =>
  llamar<TareaSuelta>({ accion: 'crearTarea', nueva })

// ---- Cuaderno de notas
export const leerNotas = () => llamar<{ notas: Nota[] }>({ accion: 'leerNotas' }).then((r) => r.notas)
export const crearNota = (nota: CambiosNota) => llamar<Nota>({ accion: 'crearNota', nota })
export const actualizarNota = (id: string, cambios: CambiosNota) => llamar<Nota>({ accion: 'actualizarNota', id, cambios })
export const eliminarNota = (id: string) => llamar<{ ok: true }>({ accion: 'eliminarNota', id })
export const restaurarNota = (id: string) => llamar<{ ok: true }>({ accion: 'restaurarNota', id })

const CLAVE_NOTAS = 'paperflow:notas'
export function guardarCopiaNotas(n: Nota[]) {
  try {
    localStorage.setItem(CLAVE_NOTAS, JSON.stringify(n))
  } catch {
    /* sin almacenamiento */
  }
}
export function leerCopiaNotas(): Nota[] | null {
  try {
    const t = localStorage.getItem(CLAVE_NOTAS)
    return t ? (JSON.parse(t) as Nota[]) : null
  } catch {
    return null
  }
}

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
