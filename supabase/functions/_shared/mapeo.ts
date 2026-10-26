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
  // Base "Cuaderno de notas".
  nota: {
    titulo: 'Título',
    contenido: 'Contenido',
    proyecto: 'Proyecto',
    fijada: 'Fijada',
  },
  // Base "Tareas sueltas": mismos nombres que Pendientes para estado, fechas, nota y cierre.
  sue: {
    titulo: 'Tarea',
    proyecto: 'Proyecto',
    ambito: 'Ámbito',
    estado: 'Estado',
    fechaCierre: 'Fecha de cierre',
    evidencia: 'Evidencia',
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

// ---------------------------------------------------------------- Tareas sueltas

/** Nombre con que la vista agrupa las tareas sueltas de un proyecto. */
export const NOMBRE_SUELTAS = 'Tareas sueltas'
export const PROYECTOS = ['Kefuri', 'Ruta Digital', 'Paperflow', 'Tecnopolis', 'Cap Ideas', 'Otro'] as const
export const AMBITOS = ['Trabajo', 'Personal'] as const

export interface TareaSuelta {
  id: string
  titulo: string
  proyecto: string | null
  ambito: 'Trabajo' | 'Personal'
  estado: string | null
  fechaCierre: string | null
  evidencia: string
  nota: string
  enFoco: string | null
  cerradoPor: string | null
  notionUrl: string
  editadoEn: string
}

export function aTareaSuelta(pg: Pagina): TareaSuelta {
  const p = pg.properties
  return {
    id: pg.id,
    titulo: texto(p[PROP.sue.titulo]) || 'Sin título',
    proyecto: seleccion(p[PROP.sue.proyecto]),
    ambito: seleccion(p[PROP.sue.ambito]) === 'Personal' ? 'Personal' : 'Trabajo',
    estado: seleccion(p[PROP.sue.estado]),
    fechaCierre: fecha(p[PROP.sue.fechaCierre]),
    evidencia: texto(p[PROP.sue.evidencia]),
    nota: texto(p[PROP.sue.nota]),
    enFoco: fecha(p[PROP.sue.enFoco]),
    cerradoPor: seleccion(p[PROP.sue.cerradoPor]),
    notionUrl: pg.url,
    editadoEn: pg.last_edited_time,
  }
}

export interface NuevaTarea {
  titulo: string
  proyecto: string
  ambito: string
  nota?: string
  enFoco?: string | null
}

/** Propiedades de una tarea suelta nueva: título, proyecto, ámbito, nota y "para hoy". */
// deno-lint-ignore no-explicit-any
export function propiedadesNuevaTarea(n: Record<string, unknown>): Record<string, any> {
  const permitidos = ['titulo', 'proyecto', 'ambito', 'nota', 'enFoco']
  const extra = Object.keys(n).filter((k) => !permitidos.includes(k))
  if (extra.length) throw new ErrorCambios(`Campos no permitidos: ${extra.join(', ')}`)
  const titulo = typeof n.titulo === 'string' ? n.titulo.trim() : ''
  if (!titulo || titulo.length > 200) throw new ErrorCambios('titulo: texto de 1 a 200 caracteres')
  const proyecto = validarOpcion(n.proyecto, PROYECTOS, 'proyecto')
  const ambito = validarOpcion(n.ambito, AMBITOS, 'ambito')
  const nota = n.nota === undefined ? '' : n.nota
  if (typeof nota !== 'string' || nota.length > 500) throw new ErrorCambios('nota: texto de hasta 500 caracteres')
  const enFoco = n.enFoco === undefined ? null : validarFecha(n.enFoco, 'enFoco')

  // deno-lint-ignore no-explicit-any
  const props: Record<string, any> = {
    [PROP.sue.titulo]: { title: [{ text: { content: titulo } }] },
    [PROP.sue.proyecto]: { select: { name: proyecto } },
    [PROP.sue.ambito]: { select: { name: ambito } },
    [PROP.sue.estado]: { select: { name: 'Abierto' } },
  }
  if (nota.trim()) props[PROP.sue.nota] = { rich_text: [{ text: { content: nota.trim() } }] }
  if (enFoco) props[PROP.sue.enFoco] = { date: { start: enFoco } }
  return props
}

// ---------------------------------------------------------------- Cuaderno de notas

export const PROYECTOS_NOTA = ['General', ...PROYECTOS] as const
/** Notion entrega hasta 25 trozos por propiedad de texto: 10 trozos de 2000 caracteres caben de sobra. */
export const MAX_CONTENIDO_NOTA = 20000
const TROZO = 2000

export interface Nota {
  id: string
  titulo: string
  contenido: string
  proyecto: string
  fijada: boolean
  creada: string
  editada: string
  notionUrl: string
}

export function aNota(pg: Pagina): Nota {
  const p = pg.properties
  return {
    id: pg.id,
    titulo: texto(p[PROP.nota.titulo]),
    contenido: texto(p[PROP.nota.contenido]),
    proyecto: seleccion(p[PROP.nota.proyecto]) ?? 'General',
    fijada: casilla(p[PROP.nota.fijada]),
    // deno-lint-ignore no-explicit-any
    creada: (pg as any).created_time ?? pg.last_edited_time,
    editada: pg.last_edited_time,
    notionUrl: pg.url,
  }
}

const enTrozos = (s: string) => {
  const trozos: { text: { content: string } }[] = []
  for (let i = 0; i < s.length; i += TROZO) trozos.push({ text: { content: s.slice(i, i + TROZO) } })
  return trozos
}

export interface CambiosNota {
  titulo?: string
  contenido?: string
  proyecto?: string
  fijada?: boolean
}

/** Propiedades de una nota (nueva o editada). Solo título, contenido, proyecto y fijada. */
// deno-lint-ignore no-explicit-any
export function propiedadesNota(c: Record<string, unknown>, nueva = false): Record<string, any> {
  const permitidos = ['titulo', 'contenido', 'proyecto', 'fijada']
  const extra = Object.keys(c).filter((k) => !permitidos.includes(k))
  if (extra.length) throw new ErrorCambios(`Campos no permitidos: ${extra.join(', ')}`)
  if (!nueva && !Object.keys(c).length) throw new ErrorCambios('Sin cambios')

  // deno-lint-ignore no-explicit-any
  const props: Record<string, any> = {}
  if ('titulo' in c || nueva) {
    const titulo = c.titulo === undefined ? '' : c.titulo
    if (typeof titulo !== 'string' || titulo.length > 200) throw new ErrorCambios('titulo: texto de hasta 200 caracteres')
    props[PROP.nota.titulo] = { title: titulo.trim() ? [{ text: { content: titulo.trim() } }] : [] }
  }
  if ('contenido' in c) {
    if (typeof c.contenido !== 'string' || c.contenido.length > MAX_CONTENIDO_NOTA) {
      throw new ErrorCambios(`contenido: texto de hasta ${MAX_CONTENIDO_NOTA} caracteres`)
    }
    props[PROP.nota.contenido] = { rich_text: enTrozos(c.contenido) }
  }
  if ('proyecto' in c || nueva) {
    props[PROP.nota.proyecto] = { select: { name: validarOpcion(c.proyecto ?? 'General', PROYECTOS_NOTA, 'proyecto') } }
  }
  if ('fijada' in c) {
    if (typeof c.fijada !== 'boolean') throw new ErrorCambios('fijada: debe ser verdadero o falso')
    props[PROP.nota.fijada] = { checkbox: c.fijada }
  }
  return props
}
