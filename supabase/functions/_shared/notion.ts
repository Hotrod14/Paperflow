// Cliente mínimo de la API de Notion. El token nunca sale de aquí.
//
// Secrets:
//   NOTION_TOKEN                 token de la integración interna
//   NOTION_DS_AUDITORIAS         data source "Auditorías"
//   NOTION_DS_PENDIENTES         data source "Pendientes"
//   NOTION_DB_AUDITORIAS / NOTION_DB_PENDIENTES   bases que los contienen
//   NOTION_VERSION (opcional)    por defecto 2025-09-03 (API de data sources)

import { ErrorHttp } from './respuesta.ts'

const TOKEN = Deno.env.get('NOTION_TOKEN') ?? ''
const VERSION = Deno.env.get('NOTION_VERSION') ?? '2025-09-03'
export const DS_AUDITORIAS = Deno.env.get('NOTION_DS_AUDITORIAS') ?? 'c1c04c08-f1f0-45d7-b313-6df22152c8f7'
export const DS_PENDIENTES = Deno.env.get('NOTION_DS_PENDIENTES') ?? '7ee6b1c6-1c7a-401f-baf5-9b4aaf1594c4'
// Bases que contienen esos data sources (para validar el padre de una página).
export const DB_AUDITORIAS = Deno.env.get('NOTION_DB_AUDITORIAS') ?? 'c19ec3ae68b14e2e9342afb373f5e5d3'
export const DB_PENDIENTES = Deno.env.get('NOTION_DB_PENDIENTES') ?? 'df3a9d5b94864ca0b4086fe272581e47'
// Base "Tareas sueltas" (lo espontáneo, separado de auditorías y pendientes).
export const DS_SUELTAS = Deno.env.get('NOTION_DS_SUELTAS') ?? '14c8c58e-ba0c-4235-88f8-39727f4de2f6'
export const DB_SUELTAS = Deno.env.get('NOTION_DB_SUELTAS') ?? 'd50a9894a07d45a98cae3120e4e4b59b'

// Base "Cuaderno de notas".
export const DS_NOTAS = Deno.env.get('NOTION_DS_NOTAS') ?? '7c71f03f-62c5-4f63-8213-a2bd1bb256a4'
export const DB_NOTAS = Deno.env.get('NOTION_DB_NOTAS') ?? 'a807771f406b43f29a2e95f007b0f411'

export type Base = { dataSource: string; database: string }

const sinGuiones = (id: string) => id.replace(/-/g, '').toLowerCase()

async function notion(ruta: string, init: RequestInit = {}, intento = 0): Promise<unknown> {
  if (!TOKEN) throw new ErrorHttp('Falta configurar NOTION_TOKEN', 500)
  const res = await fetch(`https://api.notion.com/v1${ruta}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Notion-Version': VERSION,
      // Un FormData (subida de archivos) pone su propio Content-Type con el separador.
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init.headers ?? {}),
    },
  })
  // Límite de velocidad de Notion: reintenta respetando Retry-After (máx. 2 veces).
  if (res.status === 429 && intento < 2) {
    const espera = Number(res.headers.get('Retry-After') ?? '1')
    await new Promise((r) => setTimeout(r, Math.min(espera, 5) * 1000))
    return notion(ruta, init, intento + 1)
  }
  if (!res.ok) {
    const cuerpo = await res.text()
    console.error(`Notion ${res.status} ${ruta}: ${cuerpo.slice(0, 300)}`)
    if (res.status === 404) throw new ErrorHttp('No encontrado en Notion (¿la integración tiene acceso?)', 404)
    throw new ErrorHttp('Notion no respondió correctamente', 502)
  }
  return res.json()
}

// deno-lint-ignore no-explicit-any
type Pagina = any

/** Lee todas las páginas de un data source, paginando. */
export async function consultarTodo(dataSourceId: string, filtro?: unknown): Promise<Pagina[]> {
  const paginas: Pagina[] = []
  let cursor: string | undefined
  for (let vuelta = 0; vuelta < 20; vuelta++) {
    // deno-lint-ignore no-explicit-any
    const cuerpo: Record<string, any> = { page_size: 100 }
    if (filtro) cuerpo.filter = filtro
    if (cursor) cuerpo.start_cursor = cursor
    // deno-lint-ignore no-explicit-any
    const res: any = await notion(`/data_sources/${dataSourceId}/query`, { method: 'POST', body: JSON.stringify(cuerpo) })
    // deno-lint-ignore no-explicit-any
    paginas.push(...res.results.filter((p: any) => p.object === 'page' && p.properties))
    if (!res.has_more || !res.next_cursor) break
    cursor = res.next_cursor
  }
  return paginas
}

/**
 * Actualiza una página SOLO si pertenece al data source esperado.
 * Evita que la API se use para editar cualquier otra página del workspace.
 */
/** Lee una página y confirma que su padre es una de las bases esperadas de Paperflow. */
export async function paginaDe(pageId: string, esperadas: Base[]) {
  // deno-lint-ignore no-explicit-any
  const pagina: any = await notion(`/pages/${pageId}`)
  const padre = pagina?.parent ?? {}
  const coincide = esperadas.some(
    (e) =>
      (padre.data_source_id && sinGuiones(padre.data_source_id) === sinGuiones(e.dataSource)) ||
      (padre.database_id && sinGuiones(padre.database_id) === sinGuiones(e.database)),
  )
  if (!coincide) throw new ErrorHttp('La página no pertenece a Paperflow', 403)
  return pagina
}

export async function actualizarPagina(pageId: string, esperado: Base[], propiedades: unknown) {
  await paginaDe(pageId, esperado)
  return escribirPropiedades(pageId, propiedades)
}

/** Escribe propiedades sin volver a validar. Solo para páginas ya validadas con paginaDe. */
export function escribirPropiedades(pageId: string, propiedades: unknown) {
  return notion(`/pages/${pageId}`, { method: 'PATCH', body: JSON.stringify({ properties: propiedades }) })
}

// ---- Imágenes del cuaderno (API de subida de archivos de Notion)

/** Sube un archivo a Notion. Queda sin usar hasta pegarlo en una página (Notion lo descarta a la hora). */
export async function subirArchivo(nombre: string, tipo: string, bytes: Uint8Array): Promise<string> {
  // deno-lint-ignore no-explicit-any
  const subida: any = await notion('/file_uploads', { method: 'POST', body: JSON.stringify({ filename: nombre, content_type: tipo }) })
  const form = new FormData()
  form.append('file', new Blob([bytes as BlobPart], { type: tipo }), nombre)
  await notion(`/file_uploads/${subida.id}/send`, { method: 'POST', body: form })
  return subida.id as string
}

/** Pega imágenes subidas al final del cuerpo de una página ya validada. Devuelve los ids de bloque, en el mismo orden. */
export async function pegarImagenes(pageId: string, subidas: string[]): Promise<string[]> {
  // deno-lint-ignore no-explicit-any
  const res: any = await notion(`/blocks/${pageId}/children`, {
    method: 'PATCH',
    body: JSON.stringify({
      children: subidas.map((id) => ({ object: 'block', type: 'image', image: { type: 'file_upload', file_upload: { id } } })),
    }),
  })
  // deno-lint-ignore no-explicit-any
  const bloques = (res.results ?? []).filter((b: any) => b.type === 'image').map((b: any) => b.id as string)
  return bloques.slice(-subidas.length)
}

/** Imágenes del cuerpo de una página ya validada, con su URL temporal (Notion la renueva cada hora). */
export async function imagenesDePagina(pageId: string): Promise<{ id: string; url: string }[]> {
  const imagenes: { id: string; url: string }[] = []
  let cursor: string | undefined
  for (let vuelta = 0; vuelta < 5; vuelta++) {
    // deno-lint-ignore no-explicit-any
    const res: any = await notion(`/blocks/${pageId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`)
    for (const b of res.results ?? []) {
      if (b.type !== 'image' || b.in_trash || b.archived) continue
      const url = b.image?.file?.url ?? b.image?.external?.url
      if (url) imagenes.push({ id: b.id, url })
    }
    if (!res.has_more || !res.next_cursor) break
    cursor = res.next_cursor
  }
  return imagenes
}

/** Manda un bloque a la papelera. */
export function archivarBloque(blockId: string) {
  return notion(`/blocks/${blockId}`, { method: 'DELETE' })
}

/** Crea una fila en un data source de Paperflow. Requiere la capacidad "Insert content". */
export function crearPagina(dataSource: string, propiedades: unknown) {
  return notion('/pages', {
    method: 'POST',
    body: JSON.stringify({ parent: { type: 'data_source_id', data_source_id: dataSource }, properties: propiedades }),
  })
}

/** Manda una página a la papelera de Notion (o la saca de ahí). Se puede recuperar. */
export async function aPapelera(pageId: string, esperado: Base[], enPapelera: boolean) {
  await paginaDe(pageId, esperado)
  return notion(`/pages/${pageId}`, { method: 'PATCH', body: JSON.stringify({ in_trash: enPapelera }) })
}
