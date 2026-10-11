// Lógica pura de las vistas "Hoy" y "Semana". Sin React ni red:
// todo lo que decide qué se muestra y en qué orden vive aquí y se testea.

import type { Ambito, Auditoria, Datos, Pendiente } from './tipos.ts'
import { diasDesde, haceCuanto, sumarDias } from './fechas.ts'

export const MAX_PARA_HOY = 3
export const DIAS_QUIETO = 14
const ESPERA = 'Espera decisión'
const ORDEN_CATEGORIA: Record<string, number> = { 'Hacer ya': 0, QA: 1, 'Deuda técnica': 2 }
const RANGO_ESTADO: Record<string, number> = {
  'Crítico en curso': 0,
  'En diagnóstico': 1,
  Detenida: 2,
  'Crítico ejecutado': 3,
  'Todo ejecutado': 4,
}

export const SIN_ORIGEN_ID = '__sin-origen__'

export interface Fila {
  p: Pendiente
  esCritico: boolean
  quieto: boolean
  enHoy: boolean
}

export interface Tarjeta {
  auditoria: Auditoria
  criticos: number
  secundarios: number
  filas: Fila[]
  espera: Pendiente[]
  actualizado: string
  sugerencia: { estado: 'Crítico ejecutado' | 'Todo ejecutado'; texto: string } | null
}

export interface ItemHoy {
  p: Pendiente
  auditoria: Auditoria | null
  esCritico: boolean
  deAyer: boolean
  hecho: boolean
}

export interface VistaHoy {
  tarjetas: Tarjeta[]
  paraHoy: ItemHoy[]
  abiertosEnHoy: number
  lleno: boolean
  resumen: { auditorias: number; criticos: number; secundarios: number; espera: number; quietos: number }
}

const abierto = (p: Pendiente) => p.estado === 'Abierto'
const esCritico = (p: Pendiente) => p.tipo === 'Crítico'

/** Auditoría ficticia para pendientes sin origen: así nunca quedan fuera de la vista. */
function auditoriaSinOrigen(ambito: Ambito): Auditoria {
  return {
    id: SIN_ORIGEN_ID,
    nombre: 'Pendientes sin origen',
    proyecto: null,
    ambito,
    tipoOrigen: null,
    estado: null,
    problemaCritico: '',
    pagina: null,
    notionUrl: '',
    inicio: null,
    ultimaActividad: null,
    editadoEn: new Date(0).toISOString(),
  }
}

export function auditoriaDe(datos: Datos, p: Pendiente): Auditoria | null {
  return datos.auditorias.find((a) => a.id === p.origenId) ?? null
}

export function ambitoDe(datos: Datos, p: Pendiente): Ambito {
  return auditoriaDe(datos, p)?.ambito ?? 'Trabajo'
}

function compararFilas(a: Pendiente, b: Pendiente): number {
  if (esCritico(a) !== esCritico(b)) return esCritico(a) ? -1 : 1
  return (ORDEN_CATEGORIA[a.categoria ?? ''] ?? 3) - (ORDEN_CATEGORIA[b.categoria ?? ''] ?? 3)
}

export function construirHoy(datos: Datos, ambito: Ambito, hoy: string, ahora: Date = new Date()): VistaHoy {
  const enAmbito = (p: Pendiente) => ambitoDe(datos, p) === ambito
  const pendientes = datos.pendientes.filter(enAmbito)

  // ---- Para hoy: elegidos por mí (En foco); lo de días anteriores sigue con marca "de ayer".
  const paraHoy: ItemHoy[] = pendientes
    .filter((p) => p.enFoco && (abierto(p) || (p.estado === 'Hecho' && p.fechaCierre === hoy)))
    .map((p) => ({
      p,
      auditoria: auditoriaDe(datos, p),
      esCritico: esCritico(p),
      deAyer: abierto(p) && (p.enFoco as string) < hoy,
      hecho: p.estado === 'Hecho',
    }))
    .sort((a, b) => (a.p.enFoco as string).localeCompare(b.p.enFoco as string))
  const abiertosEnHoy = paraHoy.filter((i) => !i.hecho).length
  const idsEnHoy = new Set(paraHoy.filter((i) => !i.hecho).map((i) => i.p.id))

  // ---- Tarjetas por auditoría (más una para pendientes sin origen).
  const auds = datos.auditorias.filter((a) => a.ambito === ambito)
  const huerfanos = pendientes.filter((p) => !auditoriaDe(datos, p))
  const fuentes: Auditoria[] = [...auds, ...(huerfanos.length ? [auditoriaSinOrigen(ambito)] : [])]

  const tarjetas: Tarjeta[] = []
  for (const a of fuentes) {
    const suyos = a.id === SIN_ORIGEN_ID ? huerfanos : pendientes.filter((p) => p.origenId === a.id)
    const abiertos = suyos.filter(abierto)
    const criticos = abiertos.filter(esCritico).length
    const secundarios = abiertos.length - criticos

    let sugerencia: Tarjeta['sugerencia'] = null
    if (a.estado === 'Crítico en curso' && criticos === 0 && abiertos.length > 0) {
      sugerencia = { estado: 'Crítico ejecutado', texto: 'No quedan críticos abiertos: ¿marcar "crítico ejecutado"?' }
    } else if ((a.estado === 'Crítico en curso' || a.estado === 'Crítico ejecutado') && abiertos.length === 0) {
      sugerencia = { estado: 'Todo ejecutado', texto: 'No quedan pendientes abiertos: ¿marcar "todo ejecutado"?' }
    }
    // Una auditoría terminada y sin nada abierto no ocupa espacio en "Hoy".
    if (!abiertos.length && !sugerencia) continue

    const ediciones = [a.editadoEn, ...suyos.map((p) => p.editadoEn)].sort()
    tarjetas.push({
      auditoria: a,
      criticos,
      secundarios,
      filas: abiertos
        .filter((p) => p.categoria !== ESPERA)
        .sort(compararFilas)
        .map((p) => ({
          p,
          esCritico: esCritico(p),
          quieto: diasDesde(p.editadoEn, ahora) > DIAS_QUIETO,
          enHoy: idsEnHoy.has(p.id),
        })),
      espera: abiertos.filter((p) => p.categoria === ESPERA),
      actualizado: haceCuanto(ediciones[ediciones.length - 1], ahora),
      sugerencia,
    })
  }
  tarjetas.sort(
    (x, y) =>
      (RANGO_ESTADO[x.auditoria.estado ?? ''] ?? 5) - (RANGO_ESTADO[y.auditoria.estado ?? ''] ?? 5) ||
      y.criticos - x.criticos,
  )

  const abiertos = pendientes.filter(abierto)
  return {
    tarjetas,
    paraHoy,
    abiertosEnHoy,
    lleno: abiertosEnHoy >= MAX_PARA_HOY,
    resumen: {
      auditorias: tarjetas.filter((t) => t.criticos + t.secundarios > 0).length,
      criticos: abiertos.filter(esCritico).length,
      secundarios: abiertos.filter((p) => !esCritico(p)).length,
      espera: abiertos.filter((p) => p.categoria === ESPERA).length,
      quietos: abiertos.filter((p) => diasDesde(p.editadoEn, ahora) > DIAS_QUIETO).length,
    },
  }
}

// ---------------------------------------------------------------- Semana

export interface BloqueSemana {
  auditoria: Auditoria
  cerrados: Pendiente[]
  criticos: number
  secundarios: number
  espera: Pendiente[]
  detenida: boolean
}

export interface VistaSemana {
  desde: string
  hasta: string
  bloques: BloqueSemana[]
  totalCerrados: number
}

/** Últimos 7 días (hoy incluido), solo ámbito Trabajo por defecto. */
export function construirSemana(datos: Datos, ambito: Ambito, hoy: string, ahora: Date = new Date()): VistaSemana {
  const desde = sumarDias(hoy, -6)
  const bloques: BloqueSemana[] = []
  for (const a of datos.auditorias.filter((x) => x.ambito === ambito)) {
    const suyos = datos.pendientes.filter((p) => p.origenId === a.id)
    const cerrados = suyos.filter((p) => p.estado === 'Hecho' && p.fechaCierre && p.fechaCierre >= desde && p.fechaCierre <= hoy)
    const abiertos = suyos.filter(abierto)
    if (!cerrados.length && !abiertos.length) continue
    const quietos = abiertos.length > 0 && abiertos.every((p) => diasDesde(p.editadoEn, ahora) > DIAS_QUIETO)
    bloques.push({
      auditoria: a,
      cerrados,
      criticos: abiertos.filter(esCritico).length,
      secundarios: abiertos.filter((p) => !esCritico(p)).length,
      espera: abiertos.filter((p) => p.categoria === ESPERA),
      detenida: a.estado === 'Detenida' || (quietos && !cerrados.length),
    })
  }
  bloques.sort((x, y) => y.cerrados.length - x.cerrados.length || Number(x.detenida) - Number(y.detenida))
  return { desde, hasta: hoy, bloques, totalCerrados: bloques.reduce((n, b) => n + b.cerrados.length, 0) }
}

const NUMEROS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

/**
 * Guion para el reporte oral: bloques cortos, uno por idea, numerados.
 * `incluidos` son los ids de auditorías que marqué para el reporte.
 */
export function guionOral(semana: VistaSemana, incluidos: Set<string>): string {
  const lineas: string[] = []
  const activos = semana.bloques.filter((b) => incluidos.has(b.auditoria.id) && !b.detenida)
  activos.forEach((b, i) => {
    const n = NUMEROS[i] ?? `${i + 1}.`
    const titulo = `${n} ${b.auditoria.proyecto ? b.auditoria.proyecto + ' · ' : ''}${b.auditoria.nombre}`
    lineas.push(titulo)
    if (b.cerrados.length) {
      lineas.push(`✅ Se cerraron ${b.cerrados.length}: ${b.cerrados.map((p) => p.titulo).join('; ')}.`)
    } else {
      lineas.push('✅ Sin cierres esta semana.')
    }
    const quedan: string[] = []
    if (b.criticos) quedan.push(`${b.criticos} ${b.criticos === 1 ? 'crítico' : 'críticos'}`)
    if (b.secundarios) quedan.push(`${b.secundarios} ${b.secundarios === 1 ? 'secundario' : 'secundarios'}`)
    lineas.push(quedan.length ? `📌 Quedan ${quedan.join(' y ')}.` : '📌 No quedan pendientes.')
    if (b.espera.length) lineas.push(`❓ Esperan decisión: ${b.espera.length}.`)
    lineas.push('')
  })
  const detenidas = semana.bloques.filter((b) => incluidos.has(b.auditoria.id) && b.detenida)
  if (detenidas.length) {
    lineas.push(`⏸️ Detenido: ${detenidas.map((b) => b.auditoria.nombre).join(', ')}.`)
  }
  return lineas.join('\n').trim()
}
