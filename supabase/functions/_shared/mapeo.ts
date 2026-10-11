// Traducción entre las páginas de Notion y el contrato que consume el
// frontend. Archivo puro (sin Deno ni red) para poder testearlo con
// vitest desde el proyecto web.
//
// Nombres de propiedades: los de las bases "Auditorías" y "Pendientes"
// del Journal (Blueprint v1.1 de Paperflow). Si se renombra una
// propiedad en Notion, se cambia aquí y en ningún otro lugar.

export const PROP = {
  aud: {
    nombre: 'Nombre',
    proyecto: 'Proyecto',
    ambito: 'Ámbito',
    tipoOrigen: 'Tipo de origen',
    estado: 'Estado',
    problemaCritico: 'Problema crítico',
    pagina: 'Página',
    inicio: 'Inicio',
    ultimaActividad: 'Última actividad',
  },
  pen: {
    titulo: 'Pendiente',
    origen: 'Origen',
    tipo: 'Tipo',
    categoria: 'Categoría',
    estado: 'Estado',
    fechaCierre: 'Fecha de cierre',
    evidencia: 'Evidencia',
    afectaPantallas: 'Afecta pantallas',
    avisadoDiseno: 'Avisado a diseño',
    nota: 'Nota',
    enFoco: 'En foco',
    cerradoPor: 'Cerrado por',
  },
} as const

export const ESTADOS_AUDITORIA = [
  'En diagnóstico',
  'Crítico en curso',
  'Crítico ejecutado',
  'Todo ejecutado',
  'Detenida',
] as const
export const ESTADOS_PENDIENTE = ['Abierto', 'Hecho', 'Descartado'] as const
export const CERRADO_POR = ['Yo', 'Claude Code', 'Claude'] as const

export interface Auditoria {
  id: string
  nombre: string
  proyecto: string | null
  ambito: 'Trabajo' | 'Personal'
  tipoOrigen: string | null
  estado: string | null
  problemaCritico: string
  pagina: string | null
  notionUrl: string
  inicio: string | null
  ultimaActividad: string | null
  editadoEn: string
}

export interface Pendiente {
  id: string
  titulo: string
  origenId: string | null
  tipo: 'Crítico' | 'Secundario' | null
  categoria: string | null
  estado: string | null
  fechaCierre: string | null
  evidencia: string
  afectaPantallas: boolean
  avisadoDiseno: boolean
  nota: string
  enFoco: string | null
  cerradoPor: string | null
  notionUrl: string
  editadoEn: string
}

// deno-lint-ignore no-explicit-any
type Pagina = { id: string; url: string; last_edited_time: string; properties: Record<string, any> }

// deno-lint-ignore no-explicit-any
const texto = (p: any): string => {
  if (!p) return ''
  const partes = p.type === 'title' ? p.title : p.type === 'rich_text' ? p.rich_text : null
  return Array.isArray(partes) ? partes.map((t: { plain_text?: string }) => t.plain_text ?? '').join('') : ''
}
// deno-lint-ignore no-explicit-any
const seleccion = (p: any): string | null => (p?.type === 'select' ? p.select?.name ?? null : null)
// deno-lint-ignore no-explicit-any
const fecha = (p: any): string | null => (p?.type === 'date' ? p.date?.start ?? null : null)
// deno-lint-ignore no-explicit-any
const casilla = (p: any): boolean => (p?.type === 'checkbox' ? Boolean(p.checkbox) : false)
// deno-lint-ignore no-explicit-any
const relacion = (p: any): string | null => (p?.type === 'relation' ? p.relation?.[0]?.id ?? null : null)
// deno-lint-ignore no-explicit-any
const url = (p: any): string | null => (p?.type === 'url' ? p.url ?? null : null)

export function aAuditoria(pg: Pagina): Auditoria {
  const p = pg.properties
  const ambito = seleccion(p[PROP.aud.ambito])
  return {
    id: pg.id,
    nombre: texto(p[PROP.aud.nombre]) || 'Sin nombre',
    proyecto: seleccion(p[PROP.aud.proyecto]),
    ambito: ambito === 'Personal' ? 'Personal' : 'Trabajo',
    tipoOrigen: seleccion(p[PROP.aud.tipoOrigen]),
    estado: seleccion(p[PROP.aud.estado]),
    problemaCritico: texto(p[PROP.aud.problemaCritico]),
    pagina: url(p[PROP.aud.pagina]),
    notionUrl: pg.url,
    inicio: fecha(p[PROP.aud.inicio]),
    ultimaActividad: fecha(p[PROP.aud.ultimaActividad]),
    editadoEn: pg.last_edited_time,
  }
}

export function aPendiente(pg: Pagina): Pendiente {
  const p = pg.properties
  const tipo = seleccion(p[PROP.pen.tipo])
  return {
    id: pg.id,
    titulo: texto(p[PROP.pen.titulo]) || 'Sin título',
    origenId: relacion(p[PROP.pen.origen]),
    tipo: tipo === 'Crítico' || tipo === 'Secundario' ? tipo : null,
    categoria: seleccion(p[PROP.pen.categoria]),
    estado: seleccion(p[PROP.pen.estado]),
    fechaCierre: fecha(p[PROP.pen.fechaCierre]),
    evidencia: texto(p[PROP.pen.evidencia]),
    afectaPantallas: casilla(p[PROP.pen.afectaPantallas]),
    avisadoDiseno: casilla(p[PROP.pen.avisadoDiseno]),
    nota: texto(p[PROP.pen.nota]),
    enFoco: fecha(p[PROP.pen.enFoco]),
    cerradoPor: seleccion(p[PROP.pen.cerradoPor]),
    notionUrl: pg.url,
    editadoEn: pg.last_edited_time,
  }
}

// ---------- Escritura: lista blanca de cambios permitidos ----------

export interface CambiosPendiente {
  estado?: string
  fechaCierre?: string | null
  cerradoPor?: string | null
  evidencia?: string
  enFoco?: string | null
  avisadoDiseno?: boolean
}
export interface CambiosAuditoria {
  estado?: string
}

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/

export class ErrorCambios extends Error {}

const validarFecha = (v: unknown, campo: string): string | null => {
  if (v === null) return null
  if (typeof v !== 'string' || !FECHA_RE.test(v)) throw new ErrorCambios(`${campo}: fecha inválida`)
  return v
}
const validarOpcion = (v: unknown, opciones: readonly string[], campo: string): string => {
  if (typeof v !== 'string' || !opciones.includes(v)) throw new ErrorCambios(`${campo}: valor no permitido`)
  return v
}

/** Convierte cambios validados en el objeto `properties` de PATCH /v1/pages. */
// deno-lint-ignore no-explicit-any
export function propiedadesPendiente(cambios: Record<string, unknown>): Record<string, any> {
  const permitidos = ['estado', 'fechaCierre', 'cerradoPor', 'evidencia', 'enFoco', 'avisadoDiseno']
  const extra = Object.keys(cambios).filter((k) => !permitidos.includes(k))
  if (extra.length) throw new ErrorCambios(`Campos no permitidos: ${extra.join(', ')}`)
  if (!Object.keys(cambios).length) throw new ErrorCambios('Sin cambios')

  // deno-lint-ignore no-explicit-any
  const props: Record<string, any> = {}
  if ('estado' in cambios) props[PROP.pen.estado] = { select: { name: validarOpcion(cambios.estado, ESTADOS_PENDIENTE, 'estado') } }
  if ('fechaCierre' in cambios) {
    const f = validarFecha(cambios.fechaCierre, 'fechaCierre')
    props[PROP.pen.fechaCierre] = { date: f ? { start: f } : null }
  }
  if ('enFoco' in cambios) {
    const f = validarFecha(cambios.enFoco, 'enFoco')
    props[PROP.pen.enFoco] = { date: f ? { start: f } : null }
  }
  if ('cerradoPor' in cambios) {
    props[PROP.pen.cerradoPor] = {
      select: cambios.cerradoPor === null ? null : { name: validarOpcion(cambios.cerradoPor, CERRADO_POR, 'cerradoPor') },
    }
  }
  if ('evidencia' in cambios) {
    if (typeof cambios.evidencia !== 'string' || cambios.evidencia.length > 500) {
      throw new ErrorCambios('evidencia: texto de hasta 500 caracteres')
    }
    props[PROP.pen.evidencia] = { rich_text: cambios.evidencia ? [{ text: { content: cambios.evidencia } }] : [] }
  }
  if ('avisadoDiseno' in cambios) {
    if (typeof cambios.avisadoDiseno !== 'boolean') throw new ErrorCambios('avisadoDiseno: debe ser verdadero o falso')
    props[PROP.pen.avisadoDiseno] = { checkbox: cambios.avisadoDiseno }
  }
  return props
}

// deno-lint-ignore no-explicit-any
export function propiedadesAuditoria(cambios: Record<string, unknown>): Record<string, any> {
  const extra = Object.keys(cambios).filter((k) => k !== 'estado')
  if (extra.length) throw new ErrorCambios(`Campos no permitidos: ${extra.join(', ')}`)
  if (!('estado' in cambios)) throw new ErrorCambios('Sin cambios')
  return { [PROP.aud.estado]: { select: { name: validarOpcion(cambios.estado, ESTADOS_AUDITORIA, 'estado') } } }
}
