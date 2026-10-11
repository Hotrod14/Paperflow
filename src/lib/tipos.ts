// El contrato con la función "paperflow" se define en un solo lugar:
// el mapeo de la Edge Function. Aquí solo se re-exportan los tipos.
export type { Auditoria, Pendiente, CambiosPendiente, CambiosAuditoria } from '../../supabase/functions/_shared/mapeo.ts'
import type { Auditoria, Pendiente } from '../../supabase/functions/_shared/mapeo.ts'

export type Ambito = 'Trabajo' | 'Personal'

export interface Datos {
  leidoEn: string
  auditorias: Auditoria[]
  pendientes: Pendiente[]
}
