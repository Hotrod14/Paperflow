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
//   { accion: "subirImagen", nombre, tipo, datos(base64) } → { archivo } (se pega en la nota al guardar)
//   { accion: "leerImagenes", id }                      → imágenes de la nota con URL temporal
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
  archivarBloque,
  escribirPropiedades,
  imagenesDePagina,
  paginaDe,
  pegarImagenes,
  subirArchivo,
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
import { archivosABloques, idsImagen, MAX_BYTES_IMAGEN, TIPOS_IMAGEN } from '../_shared/imagenes.ts'

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

    /** Pega en la página las imágenes subidas que marca el texto y devuelve el texto apuntando a sus bloques. */
    const conImagenesPegadas = async (pageId: string, contenido: string) => {
      const subidas = [...new Set(idsImagen(contenido, 'archivo'))]
      if (!subidas.length) return contenido
      const bloques = await pegarImagenes(pageId, subidas)
      return archivosABloques(contenido, Object.fromEntries(subidas.map((id, i) => [id, bloques[i]]).filter(([, b]) => b)))
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
      const contenido = typeof body.nota.contenido === 'string' ? body.nota.contenido : ''
      if (!idsImagen(contenido, 'archivo').length) return json(req, aNota(creada))
      // Las imágenes recién subidas se pegan en la página y su marca pasa a apuntar al bloque.
      const final = await conImagenesPegadas(creada.id, contenido)
      // deno-lint-ignore no-explicit-any
      const lista: any = await escribirPropiedades(creada.id, conCambios(() => propiedadesNota({ contenido: final })))
      return json(req, aNota(lista))
    }

    if (body?.accion === 'subirImagen') {
      const tipo = String(body.tipo ?? '')
      if (!(TIPOS_IMAGEN as readonly string[]).includes(tipo)) throw new ErrorHttp('Formato de imagen no admitido (usa PNG, JPG, GIF o WebP)')
      if (typeof body.datos !== 'string' || !body.datos) throw new ErrorHttp('imagen vacía')
      let bytes: Uint8Array
      try {
        bytes = Uint8Array.from(atob(body.datos), (c) => c.charCodeAt(0))
      } catch {
        throw new ErrorHttp('imagen inválida')
      }
      if (bytes.length > MAX_BYTES_IMAGEN) throw new ErrorHttp('La imagen pesa más de 5 MB')
      const extension = tipo.split('/')[1].replace('jpeg', 'jpg')
      const base = String(body.nombre ?? 'imagen').replace(/\.[a-z0-9]+$/i, '').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 60) || 'imagen'
      const archivo = await subirArchivo(`${base}.${extension}`, tipo, bytes)
      return json(req, { archivo })
    }

    if (body?.accion === 'leerImagenes') {
      if (typeof body.id !== 'string' || !ID_RE.test(body.id)) throw new ErrorHttp('id inválido')
      await paginaDe(body.id, BASE_NOTAS)
      return json(req, { imagenes: await imagenesDePagina(body.id) })
    }

    if (body?.accion === 'actualizarNota' || body?.accion === 'eliminarNota' || body?.accion === 'restaurarNota') {
      if (typeof body.id !== 'string' || !ID_RE.test(body.id)) throw new ErrorHttp('id inválido')
      if (body.accion === 'actualizarNota') {
        if (!body.cambios || typeof body.cambios !== 'object') throw new ErrorHttp('cambios inválidos')
        conCambios(() => propiedadesNota(body.cambios)) // valida antes de tocar nada
        if (typeof body.cambios.contenido !== 'string') {
          // deno-lint-ignore no-explicit-any
          const pagina: any = await actualizarPagina(body.id, BASE_NOTAS, propiedadesNota(body.cambios))
          return json(req, aNota(pagina))
        }
        const anterior = aNota(await paginaDe(body.id, BASE_NOTAS))
        const contenido = await conImagenesPegadas(body.id, body.cambios.contenido)
        // deno-lint-ignore no-explicit-any
        const pagina: any = await escribirPropiedades(body.id, conCambios(() => propiedadesNota({ ...body.cambios, contenido })))
        // Imágenes que estaban en el texto y se quitaron: su bloque va a la papelera de Notion.
        // Las que se agregaron directo en Notion (nunca marcadas en el texto) no se tocan.
        const quitadas = idsImagen(anterior.contenido, 'bloque').filter((id) => !idsImagen(contenido, 'bloque').includes(id))
        if (quitadas.length) {
          const enPagina = new Set((await imagenesDePagina(body.id)).map((i) => i.id))
          await Promise.all(quitadas.filter((id) => enPagina.has(id)).map((id) => archivarBloque(id).catch(() => null)))
        }
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
