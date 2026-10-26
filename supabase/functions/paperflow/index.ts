// Edge Function: paperflow
//
// Única puerta entre el frontend y Notion (fuente de verdad).
//   { accion: "leer", fresco?: boolean }
//       → auditorías + pendientes abiertos + cerrados en los últimos 35 días
//   { accion: "actualizarPendiente", id, cambios }
//   { accion: "actualizarAuditoria", id, cambios }
//   { accion: "crearTarea", nueva: { titulo, proyecto, ambito, nota?, enFoco? } }
//       → crea una fila en la base "Tareas sueltas"
//   { accion: "leerNotas" }                              → notas del cuaderno
//   { accion: "crearNota", nota: { titulo?, contenido?, proyecto?, fijada? } }
//   { accion: "actualizarNota", id, cambios }
//   { accion: "eliminarNota", id } / { accion: "restaurarNota", id }  → papelera de Notion
//
// No guarda datos propios: solo una caché en memoria de 45 s por
// instancia, que se invalida en cada escritura.

import { exigirUsuario } from '../_shared/auth.ts'
import { ErrorHttp, errorARespuesta, json, preflight } from '../_shared/respuesta.ts'
import {
  actualizarPagina,
  consultarTodo,
  aPapelera,
  crearPagina,
  DB_NOTAS,
  DS_NOTAS,
  DB_AUDITORIAS,
  DB_PENDIENTES,
  DS_AUDITORIAS,
  DS_PENDIENTES,
  DB_SUELTAS,
  DS_SUELTAS,
} from '../_shared/notion.ts'
import {
  aAuditoria,
  aPendiente,
  aNota,
  aTareaSuelta,
  propiedadesNota,
  ErrorCambios,
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
  const vivos = {
    or: [
      { property: PROP.pen.estado, select: { equals: 'Abierto' } },
      { property: PROP.pen.fechaCierre, date: { on_or_after: hace35 } },
    ],
  }
  const [auds, pens, sueltas] = await Promise.all([
    consultarTodo(DS_AUDITORIAS),
    consultarTodo(DS_PENDIENTES, vivos),
    consultarTodo(DS_SUELTAS, vivos),
  ])
  const datos = {
    leidoEn: new Date().toISOString(),
    auditorias: auds.map(aAuditoria),
    pendientes: pens.map(aPendiente),
    sueltas: sueltas.map(aTareaSuelta),
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
      // Un pendiente puede vivir en "Pendientes" o en "Tareas sueltas" (mismos campos de cierre).
      const esperado =
        body.accion === 'actualizarPendiente'
          ? [
              { dataSource: DS_PENDIENTES, database: DB_PENDIENTES },
              { dataSource: DS_SUELTAS, database: DB_SUELTAS },
            ]
          : [{ dataSource: DS_AUDITORIAS, database: DB_AUDITORIAS }]
      await actualizarPagina(body.id, esperado, props)
      cache = null
      return json(req, { ok: true })
    }

    if (body?.accion === 'crearTarea') {
      const nueva = body.nueva
      if (!nueva || typeof nueva !== 'object') throw new ErrorHttp('nueva inválida')
      let props
      try {
        props = propiedadesNuevaTarea(nueva)
      } catch (e) {
        if (e instanceof ErrorCambios) throw new ErrorHttp(e.message)
        throw e
      }
      // Solo se crean filas en la base "Tareas sueltas".
      // deno-lint-ignore no-explicit-any
      const creada: any = await crearPagina(DS_SUELTAS, props)
      cache = null
      return json(req, aTareaSuelta(creada))
    }

    // ---- Cuaderno de notas
    const BASE_NOTAS = [{ dataSource: DS_NOTAS, database: DB_NOTAS }]
    const conCambios = <T>(f: () => T): T => {
      try {
        return f()
      } catch (e) {
        if (e instanceof ErrorCambios) throw new ErrorHttp(e.message)
        throw e
      }
    }

    if (body?.accion === 'leerNotas') {
      const notas = await consultarTodo(DS_NOTAS)
      return json(req, { notas: notas.map(aNota) })
    }

    if (body?.accion === 'crearNota') {
      if (!body.nota || typeof body.nota !== 'object') throw new ErrorHttp('nota inválida')
      const props = conCambios(() => propiedadesNota(body.nota, true))
      // deno-lint-ignore no-explicit-any
      const creada: any = await crearPagina(DS_NOTAS, props)
      return json(req, aNota(creada))
    }

    if (body?.accion === 'actualizarNota' || body?.accion === 'eliminarNota' || body?.accion === 'restaurarNota') {
      if (typeof body.id !== 'string' || !ID_RE.test(body.id)) throw new ErrorHttp('id inválido')
      if (body.accion === 'actualizarNota') {
        if (!body.cambios || typeof body.cambios !== 'object') throw new ErrorHttp('cambios inválidos')
        const props = conCambios(() => propiedadesNota(body.cambios))
        // deno-lint-ignore no-explicit-any
        const pagina: any = await actualizarPagina(body.id, BASE_NOTAS, props)
        return json(req, aNota(pagina))
      }
      await aPapelera(body.id, BASE_NOTAS, body.accion === 'eliminarNota')
      return json(req, { ok: true })
    }

    throw new ErrorHttp('Acción desconocida')
  } catch (err) {
    return errorARespuesta(req, err)
  }
})
