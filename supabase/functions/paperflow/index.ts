// Edge Function: paperflow
//
// Única puerta entre el frontend y Notion (fuente de verdad).
//   { accion: "leer", fresco?: boolean }
//       → auditorías + pendientes abiertos + cerrados en los últimos 35 días
//   { accion: "actualizarPendiente", id, cambios }
//   { accion: "actualizarAuditoria", id, cambios }
//   { accion: "crearTarea", nueva: { titulo, origenId, nota?, enFoco? } }
//       → crea una tarea suelta; el origen debe ser un "Tareas sueltas"
//
// No guarda datos propios: solo una caché en memoria de 45 s por
// instancia, que se invalida en cada escritura.

import { exigirUsuario } from '../_shared/auth.ts'
import { ErrorHttp, errorARespuesta, json, preflight } from '../_shared/respuesta.ts'
import {
  actualizarPagina,
  consultarTodo,
  crearPagina,
  paginaDe,
  DB_AUDITORIAS,
  DB_PENDIENTES,
  DS_AUDITORIAS,
  DS_PENDIENTES,
} from '../_shared/notion.ts'
import {
  aAuditoria,
  aPendiente,
  ErrorCambios,
  NOMBRE_SUELTAS,
  PROP,
  propiedadesNuevaTarea,
  propiedadesAuditoria,
  propiedadesPendiente,
} from '../_shared/mapeo.ts'

const TTL_MS = 45_000
let cache: { en: number; datos: unknown } | null = null

const ID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i

async function leer(fresco: boolean) {
  if (!fresco && cache && Date.now() - cache.en < TTL_MS) return cache.datos

  const hace35 = new Date(Date.now() - 35 * 86_400_000).toISOString().slice(0, 10)
  const [auds, pens] = await Promise.all([
    consultarTodo(DS_AUDITORIAS),
    consultarTodo(DS_PENDIENTES, {
      or: [
        { property: PROP.pen.estado, select: { equals: 'Abierto' } },
        { property: PROP.pen.fechaCierre, date: { on_or_after: hace35 } },
      ],
    }),
  ])
  const datos = {
    leidoEn: new Date().toISOString(),
    auditorias: auds.map(aAuditoria),
    pendientes: pens.map(aPendiente),
  }
  cache = { en: Date.now(), datos }
  return datos
}

Deno.serve(async (req) => {
  const corto = preflight(req)
  if (corto) return corto
  try {
    await exigirUsuario(req)
    // deno-lint-ignore no-explicit-any
    let body: any
    try {
      body = await req.json()
    } catch {
      throw new ErrorHttp('Cuerpo inválido')
    }

    if (body?.accion === 'leer') {
      return json(req, await leer(Boolean(body.fresco)))
    }

    if (body?.accion === 'actualizarPendiente' || body?.accion === 'actualizarAuditoria') {
      if (typeof body.id !== 'string' || !ID_RE.test(body.id)) throw new ErrorHttp('id inválido')
      if (!body.cambios || typeof body.cambios !== 'object') throw new ErrorHttp('cambios inválidos')
      let props
      try {
        props = body.accion === 'actualizarPendiente' ? propiedadesPendiente(body.cambios) : propiedadesAuditoria(body.cambios)
      } catch (e) {
        if (e instanceof ErrorCambios) throw new ErrorHttp(e.message)
        throw e
      }
      const esperado =
        body.accion === 'actualizarPendiente'
          ? { dataSource: DS_PENDIENTES, database: DB_PENDIENTES }
          : { dataSource: DS_AUDITORIAS, database: DB_AUDITORIAS }
      await actualizarPagina(body.id, esperado, props)
      cache = null
      return json(req, { ok: true })
    }

    if (body?.accion === 'crearTarea') {
      const nueva = body.nueva
      if (!nueva || typeof nueva !== 'object') throw new ErrorHttp('nueva inválida')
      if (typeof nueva.origenId !== 'string' || !ID_RE.test(nueva.origenId)) throw new ErrorHttp('origen inválido')
      let props
      try {
        props = propiedadesNuevaTarea(nueva)
      } catch (e) {
        if (e instanceof ErrorCambios) throw new ErrorHttp(e.message)
        throw e
      }
      // Solo se crean tareas dentro de un origen "Tareas sueltas" de Paperflow.
      const origen = aAuditoria(await paginaDe(nueva.origenId, { dataSource: DS_AUDITORIAS, database: DB_AUDITORIAS }))
      if (origen.nombre !== NOMBRE_SUELTAS) throw new ErrorHttp('Solo se pueden crear tareas en "Tareas sueltas"', 403)
      // deno-lint-ignore no-explicit-any
      const creada: any = await crearPagina(DS_PENDIENTES, props)
      cache = null
      return json(req, aPendiente(creada))
    }

    throw new ErrorHttp('Acción desconocida')
  } catch (err) {
    return errorARespuesta(req, err)
  }
})
