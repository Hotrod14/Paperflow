// El contrato con la función "paperflow" se define en un solo lugar:
// el mapeo de la Edge Function. Aquí solo se re-exportan los tipos.
export type { Auditoria, Pendiente, CambiosPendiente, CambiosAuditoria, TareaSuelta, Nota, CambiosNota } from '../../supabase/functions/_shared/mapeo.ts'
import type { Auditoria, Pendiente, TareaSuelta } from '../../supabase/functions/_shared/mapeo.ts'

export type Ambito = 'Trabajo' | 'Personal'

export interface Datos {
  leidoEn: string
  auditorias: Auditoria[]
  pendientes: Pendiente[]
  /** Base "Tareas sueltas". Opcional: copias guardadas antes de existir no la traen. */
  sueltas?: TareaSuelta[]
}
