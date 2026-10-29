import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as KeyboardEventReact } from 'react'
import type { Nota } from '../lib/tipos.ts'
import { actualizarNota, crearNota, eliminarNota, guardarCopiaNotas, leerCopiaNotas, leerImagenes, leerNotas, restaurarNota, subirImagen } from '../lib/api.ts'
import { aVista, deVista, etiquetaFoto, fechaCorta, filtrarNotas, fotosEnVista, ordenarNotas, quitarFoto, resumenNota, siguienteFoto } from '../lib/cuaderno.ts'
import { fechaLarga, haceCuanto } from '../lib/fechas.ts'
import { abrirTarea, arrancarHoja, pasarHoja, pegarCinta, trazoLapiz } from '../lib/sonido.ts'
import { aBase64, esImagen, prepararImagen } from '../lib/imagen.ts'
import { idsImagen, insertarImagen, marcaImagen, partesContenido } from '../../supabase/functions/_shared/imagenes.ts'
import { PROYECTOS_NOTA } from '../../supabase/functions/_shared/mapeo.ts'
import { createPortal } from 'react-dom'
import { Papel } from './Papel.tsx'

/** true en pantallas anchas, donde el índice se muda a la columna del menú. */
function useEscritorio() {
  const consulta = '(min-width: 721px)'
  const [es, setEs] = useState(() => {
    try {
      return window.matchMedia(consulta).matches
    } catch {
      return true
    }
  })
  useEffect(() => {
    let mq: MediaQueryList
    try {
      mq = window.matchMedia(consulta)
    } catch {
      return
    }
    const alCambiar = () => setEs(mq.matches)
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [])
  return es
}

type Aviso = { texto: string; deshacer?: () => void; error?: boolean }

/**
 * Una foto pegada en la hoja con cinta. Su alto se redondea a renglones completos
 * para que el texto que sigue caiga sobre las líneas.
 */
function Foto({ url, alt, onFalla }: { url?: string; alt: string; onFalla?: () => void }) {
  const marcoRef = useRef<HTMLSpanElement>(null)
  const [alto, setAlto] = useState<number | undefined>(undefined)
  useLayoutEffect(() => {
    const m = marcoRef.current
    if (!m) return
    const medir = () => setAlto(Math.ceil((m.offsetHeight + 24) / RENGLON) * RENGLON)
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(m)
    return () => ro.disconnect()
  }, [url])
  return (
    <figure className="foto" style={{ height: alto }}>
      <span className="foto__marco" ref={marcoRef}>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" title="abrir en tamaño completo">
            <img src={url} alt={alt} loading="lazy" onError={onFalla} />
          </a>
        ) : (
          <span className="foto__vacia datos">cargando imagen…</span>
        )}
      </span>
    </figure>
  )
}

const RENGLON = 32
/** contenido va con etiquetas [📷 imagen N]; fotos guarda N → marca completa (ver lib/cuaderno.ts). */
type Borrador = { titulo: string; contenido: string; proyecto: string; fijada: boolean; fotos: Record<string, string> }

const NUEVA = '__nueva__'
const MAX = 20000
const ANILLOS = 16

/**
 * Cuaderno de notas: índice a la izquierda y la hoja abierta a la derecha.
 * Las notas viven en la base "Cuaderno de notas" de Notion; aquí se guardan con actualización optimista.
 */
export function Cuaderno({ onAviso, lateral = null }: { onAviso: (a: Aviso) => void; lateral?: HTMLElement | null }) {
  const escritorio = useEscritorio()
  const enLateral = escritorio && lateral !== null
  const [notas, setNotas] = useState<Nota[]>(() => leerCopiaNotas() ?? [])
  const [cargando, setCargando] = useState(true)
  const [falla, setFalla] = useState<string | null>(null)
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState<Borrador | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [consulta, setConsulta] = useState('')
  const [filtro, setFiltro] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [vista, setVista] = useState<'indice' | 'hoja'>('indice')
  const tituloRef = useRef<HTMLInputElement>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const archivoRef = useRef<HTMLInputElement>(null)
  // Imágenes: id (de bloque en Notion o de subida reciente) → URL para mostrarla.
  const [urls, setUrls] = useState<Record<string, string>>({})
  // Por nota: cuándo se leyeron sus imágenes de Notion y cuáles tiene la página.
  const [imagenesNota, setImagenesNota] = useState<Record<string, { en: number; ids: string[] }>>({})
  const [subiendo, setSubiendo] = useState(0)
  const pedidas = useRef(new Set<string>())
  const fallidas = useRef(new Set<string>())

  // ---- Lectura
  useEffect(() => {
    let vivo = true
    leerNotas()
      .then((n) => {
        if (!vivo) return
        setNotas(n)
        guardarCopiaNotas(n)
        setFalla(null)
      })
      .catch((e) => vivo && setFalla(e instanceof Error ? e.message : 'No pude leer el cuaderno'))
      .finally(() => vivo && setCargando(false))
    return () => {
      vivo = false
    }
  }, [])

  const cambiarNotas = useCallback((f: (n: Nota[]) => Nota[]) => {
    setNotas((prev) => {
      const sig = f(prev)
      guardarCopiaNotas(sig)
      return sig
    })
  }, [])

  const ordenadas = useMemo(() => ordenarNotas(notas), [notas])
  const visibles = useMemo(() => filtrarNotas(ordenadas, consulta, filtro), [ordenadas, consulta, filtro])
  const proyectosUsados = useMemo(() => PROYECTOS_NOTA.filter((p) => notas.some((n) => n.proyecto === p)), [notas])
  const actual = seleccion && seleccion !== NUEVA ? notas.find((n) => n.id === seleccion) ?? null : null

  // En escritorio, abre la primera nota al cargar.
  useEffect(() => {
    if (!seleccion && ordenadas.length) setSeleccion(ordenadas[0].id)
  }, [ordenadas, seleccion])

  const sucio =
    editando &&
    borrador !== null &&
    (seleccion === NUEVA
      ? Boolean(borrador.titulo.trim() || borrador.contenido.trim())
      : actual !== null &&
        (borrador.titulo !== actual.titulo ||
          deVista(borrador.contenido, borrador.fotos) !== actual.contenido ||
          borrador.proyecto !== actual.proyecto))

  const puedeSalir = () => !sucio || window.confirm('Tienes cambios sin guardar en esta hoja. ¿Descartarlos?')

  // ---- Acciones
  function abrir(id: string) {
    if (id === seleccion && !editando) {
      setVista('hoja')
      return
    }
    if (!puedeSalir()) return
    pasarHoja()
    setSeleccion(id)
    setEditando(false)
    setBorrador(null)
    setMenu(false)
    setConfirmando(false)
    setVista('hoja')
  }

  function nueva() {
    if (!puedeSalir()) return
    abrirTarea()
    setSeleccion(NUEVA)
    setBorrador({ titulo: '', contenido: '', proyecto: filtro ?? 'General', fijada: false, fotos: {} })
    setEditando(true)
    setMenu(false)
    setVista('hoja')
  }

  function editar() {
    if (!actual) return
    trazoLapiz()
    const vista = aVista(actual.contenido)
    setBorrador({ titulo: actual.titulo, contenido: vista.texto, proyecto: actual.proyecto, fijada: actual.fijada, fotos: vista.fotos })
    setEditando(true)
    setMenu(false)
  }

  function cancelar() {
    if (!puedeSalir()) return
    setEditando(false)
    setBorrador(null)
    if (seleccion === NUEVA) {
      setSeleccion(ordenadas[0]?.id ?? null)
      setVista('indice')
    }
  }

  async function guardar() {
    if (!borrador || guardando) return
    if (subiendo > 0) {
      onAviso({ texto: 'Espera a que termine de pegarse la imagen' })
      return
    }
    if (seleccion === NUEVA) {
      if (!borrador.titulo.trim() && !borrador.contenido.trim()) {
        cancelar()
        return
      }
      setGuardando(true)
      try {
        const creada = await crearNota({
          titulo: borrador.titulo,
          contenido: deVista(borrador.contenido, borrador.fotos),
          proyecto: borrador.proyecto,
          fijada: borrador.fijada,
        })
        cambiarNotas((n) => [creada, ...n])
        if (idsImagen(creada.contenido, 'bloque').length) cargarImagenes(creada.id)
        setSeleccion(creada.id)
        setEditando(false)
        setBorrador(null)
        trazoLapiz()
        onAviso({ texto: 'Nota guardada en el cuaderno' })
      } catch (e) {
        onAviso({ texto: `No se guardó en Notion: ${e instanceof Error ? e.message : 'error'}`, error: true })
      } finally {
        setGuardando(false)
      }
      return
    }
    if (!actual) return
    const cambios: { titulo?: string; contenido?: string; proyecto?: string } = {}
    const contenido = deVista(borrador.contenido, borrador.fotos)
    if (borrador.titulo !== actual.titulo) cambios.titulo = borrador.titulo
    if (contenido !== actual.contenido) cambios.contenido = contenido
    if (borrador.proyecto !== actual.proyecto) cambios.proyecto = borrador.proyecto
    setEditando(false)
    setBorrador(null)
    if (!Object.keys(cambios).length) return
    const previa = actual
    trazoLapiz()
    cambiarNotas((n) => n.map((x) => (x.id === previa.id ? { ...x, ...cambios, editada: new Date().toISOString() } : x)))
    try {
      const guardada = await actualizarNota(previa.id, cambios)
      cambiarNotas((n) => n.map((x) => (x.id === guardada.id ? guardada : x)))
      if (cambios.contenido !== undefined && idsImagen(guardada.contenido, 'bloque').length) cargarImagenes(guardada.id)
    } catch (e) {
      cambiarNotas((n) => n.map((x) => (x.id === previa.id ? previa : x)))
      onAviso({ texto: `No se guardó en Notion: ${e instanceof Error ? e.message : 'error'}`, error: true })
    }
  }

  async function alternarFijada() {
    if (!actual) return
    const previa = actual
    trazoLapiz()
    setMenu(false)
    cambiarNotas((n) => n.map((x) => (x.id === previa.id ? { ...x, fijada: !previa.fijada } : x)))
    try {
      await actualizarNota(previa.id, { fijada: !previa.fijada })
    } catch (e) {
      cambiarNotas((n) => n.map((x) => (x.id === previa.id ? previa : x)))
      onAviso({ texto: `No se guardó en Notion: ${e instanceof Error ? e.message : 'error'}`, error: true })
    }
  }

  async function arrancar() {
    if (!actual) return
    const nota = actual
    arrancarHoja()
    setMenu(false)
    setConfirmando(false)
    const resto = ordenadas.filter((x) => x.id !== nota.id)
    cambiarNotas((n) => n.filter((x) => x.id !== nota.id))
    setSeleccion(resto[0]?.id ?? null)
    setVista('indice')
    try {
      await eliminarNota(nota.id)
      onAviso({
        texto: `Hoja arrancada: ${nota.titulo || 'sin título'}`,
        deshacer: () => {
          pasarHoja()
          cambiarNotas((n) => [nota, ...n.filter((x) => x.id !== nota.id)])
          setSeleccion(nota.id)
          restaurarNota(nota.id).catch((e) => {
            cambiarNotas((n) => n.filter((x) => x.id !== nota.id))
            onAviso({ texto: `No se pudo recuperar: ${e instanceof Error ? e.message : 'error'}`, error: true })
          })
        },
      })
    } catch (e) {
      cambiarNotas((n) => [nota, ...n.filter((x) => x.id !== nota.id)])
      setSeleccion(nota.id)
      onAviso({ texto: `No se borró en Notion: ${e instanceof Error ? e.message : 'error'}`, error: true })
    }
  }

  // ---- Teclado: Ctrl/Cmd+S guarda, Escape cancela o cierra el menú
  function alTeclear(e: KeyboardEventReact) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      void guardar()
    } else if (e.key === 'Escape') {
      if (menu) setMenu(false)
      else if (editando) cancelar()
    }
  }

  // Foco al empezar a escribir.
  useEffect(() => {
    if (!editando) return
    if (seleccion === NUEVA) tituloRef.current?.focus()
    else areaRef.current?.focus()
  }, [editando, seleccion])

  // El área de texto crece con el contenido para que los renglones sigan la hoja.
  useLayoutEffect(() => {
    const a = areaRef.current
    if (!a) return
    a.style.height = 'auto'
    a.style.height = `${Math.max(a.scrollHeight, 12 * 32)}px`
  }, [borrador?.contenido, editando])

  // Cierra el menú al tocar fuera.
  useEffect(() => {
    if (!menu) return
    const fuera = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenu(false)
        setConfirmando(false)
      }
    }
    document.addEventListener('pointerdown', fuera)
    return () => document.removeEventListener('pointerdown', fuera)
  }, [menu])

  // ---- Imágenes
  const cargarImagenes = useCallback((notaId: string) => {
    if (pedidas.current.has(notaId)) return
    pedidas.current.add(notaId)
    leerImagenes(notaId)
      .then((lista) => {
        setUrls((u) => ({ ...u, ...Object.fromEntries(lista.map((i) => [i.id, i.url])) }))
        setImagenesNota((m) => ({ ...m, [notaId]: { en: Date.now(), ids: lista.map((i) => i.id) } }))
      })
      .catch(() => {
        /* sin imágenes por ahora: la hoja muestra "cargando imagen…" y el texto sigue legible */
      })
      .finally(() => pedidas.current.delete(notaId))
  }, [])

  // Al abrir una nota se piden sus imágenes; las URL de Notion vencen en una hora, así que se renuevan antes.
  useEffect(() => {
    if (!actual) return
    const info = imagenesNota[actual.id]
    const edad = info ? Date.now() - info.en : Infinity
    const faltan = idsImagen(actual.contenido, 'bloque').some((id) => !urls[id])
    if (edad > 45 * 60_000 || (faltan && edad > 5_000)) cargarImagenes(actual.id)
  }, [actual, imagenesNota, urls, cargarImagenes])

  /** Una URL vencida: se vuelve a pedir la lista de esa nota (una vez por URL). */
  function imagenFallo(notaId: string, url: string | undefined) {
    if (!url || url.startsWith('blob:') || fallidas.current.has(url)) return
    fallidas.current.add(url)
    setImagenesNota((m) => ({ ...m, [notaId]: { en: 0, ids: m[notaId]?.ids ?? [] } }))
  }

  async function pegarImagenes(archivos: File[]) {
    const imagenes = archivos.filter(esImagen)
    if (!imagenes.length) {
      if (archivos.length) onAviso({ texto: 'Solo se pueden pegar imágenes PNG, JPG, GIF o WebP', error: true })
      return
    }
    for (const archivo of imagenes) {
      setSubiendo((n) => n + 1)
      try {
        const lista = await prepararImagen(archivo)
        const id = await subirImagen(lista.nombre, lista.tipo, await aBase64(lista.blob))
        setUrls((u) => ({ ...u, [id]: URL.createObjectURL(lista.blob) }))
        const area = areaRef.current
        const pos = area && document.activeElement === area ? area.selectionStart : Number.MAX_SAFE_INTEGER
        let tras = 0
        setBorrador((b) => {
          if (!b) return b
          const n = siguienteFoto(b.fotos)
          const r = insertarImagen(b.contenido, pos, etiquetaFoto(n))
          tras = r.pos
          return { ...b, contenido: r.texto, fotos: { ...b.fotos, [n]: marcaImagen('archivo', id) } }
        })
        requestAnimationFrame(() => {
          if (area && document.activeElement === area) area.setSelectionRange(tras, tras)
        })
        pegarCinta()
      } catch (e) {
        onAviso({ texto: `No se pegó la imagen: ${e instanceof Error ? e.message : 'error'}`, error: true })
      } finally {
        setSubiendo((n) => n - 1)
      }
    }
  }

  function quitarDelBorrador(n: string) {
    arrancarHoja()
    setBorrador((b) => (b ? { ...b, contenido: quitarFoto(b.contenido, n) } : b))
  }

  const fijadas = notas.filter((n) => n.fijada).length
  const fechaHoja = actual ? fechaLarga(new Date(actual.creada)) : fechaLarga()

  const indice = (
    <Papel as="section" borde="b" girar={-0.3} aria-label="Índice del cuaderno">
      <div className="indice">
        <h2 className="indice__titulo">índice</h2>
        <div className="campo">
          <label htmlFor="buscar-notas" className="sr">
            Buscar en el cuaderno
          </label>
          <input
            id="buscar-notas"
            type="search"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="buscar en el cuaderno…"
          />
        </div>
        {proyectosUsados.length > 1 && (
          <div className="indice__filtros" role="group" aria-label="Filtrar por proyecto">
            <button type="button" aria-pressed={filtro === null} onClick={() => setFiltro(null)}>
              todas
            </button>
            {proyectosUsados.map((p) => (
              <button key={p} type="button" aria-pressed={filtro === p} onClick={() => setFiltro(filtro === p ? null : p)}>
                {p.toLowerCase()}
              </button>
            ))}
          </div>
        )}

        {cargando && !notas.length ? (
          <p className="manuscrita suave indice__vacio">abriendo el cuaderno…</p>
        ) : visibles.length === 0 ? (
          <p className="manuscrita suave indice__vacio">
            {notas.length ? 'nada coincide con la búsqueda.' : 'aún no hay notas. empieza la primera.'}
          </p>
        ) : (
          <ol className="lista-limpia indice__lista">
            {visibles.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className="indice__item"
                  aria-current={n.id === seleccion ? 'true' : undefined}
                  onClick={() => abrir(n.id)}
                >
                  <span className="indice__nombre">
                    {n.fijada && (
                      <span aria-label="fijada" title="fijada">
                        📌{' '}
                      </span>
                    )}
                    {n.titulo || resumenNota(n, 40) || 'sin título'}
                  </span>
                  <span className="datos indice__meta">
                    {n.proyecto !== 'General' ? `${n.proyecto.toLowerCase()} · ` : ''}
                    {fechaCorta(n.editada)}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Papel>
  )

  return (
    <div className="columna-principal cuaderno" onKeyDown={alTeclear}>
      <div className="cabecera">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="datos" style={{ fontSize: 13 }}>
            {fechaLarga()}
          </span>
          <h1 className="titulo-pagina">cuaderno</h1>
          <span className="suave" style={{ fontSize: 17 }}>
            {notas.length} {notas.length === 1 ? 'nota' : 'notas'}
            {fijadas > 0 && ` · ${fijadas} ${fijadas === 1 ? 'fijada' : 'fijadas'}`}
          </span>
        </div>
        <button type="button" className="btn-mano" onClick={nueva}>
          + nueva nota
        </button>
      </div>

      {falla && (
        <div className="banda" role="status">
          No pude leer el cuaderno ({falla}). {notas.length ? 'Muestro la última copia guardada.' : ''}
        </div>
      )}

      <div className="cuaderno__mesa" data-vista={vista} data-lateral={enLateral ? '' : undefined}>
        {/* ---------------- Índice: en escritorio vive bajo el menú lateral */}
        {enLateral ? createPortal(<div className="cuaderno__indice cuaderno__indice--lateral">{indice}</div>, lateral!) : <div className="cuaderno__indice">{indice}</div>}

        {/* ---------------- Hoja abierta */}
        <article className="cuaderno__hoja" aria-label={actual ? actual.titulo || 'Nota sin título' : 'Hoja'}>
          <div className="cuaderno__espiral" aria-hidden="true">
            {Array.from({ length: ANILLOS }, (_, i) => (
              <span key={i} className="anillo" />
            ))}
          </div>

          <div className="cuaderno__barra">
            <button type="button" className="btn-texto btn-texto--suave cuaderno__volver" onClick={() => (puedeSalir() ? (setEditando(false), setVista('indice')) : null)}>
              ← índice
            </button>
            <span className="cuaderno__fecha">{seleccion === NUEVA ? fechaLarga() : fechaHoja}</span>
            {actual && !editando && (
              <div className="cuaderno__menu-ancla" ref={menuRef}>
                <button
                  type="button"
                  className="cuaderno__puntos"
                  aria-haspopup="menu"
                  aria-expanded={menu}
                  aria-label="Opciones de la nota"
                  onClick={() => {
                    setMenu(!menu)
                    setConfirmando(false)
                  }}
                >
                  ···
                </button>
                {menu && (
                  <div className="papel cuaderno__menu" role="menu">
                    {confirmando ? (
                      <>
                        <p className="cuaderno__pregunta">¿Arrancar esta hoja?</p>
                        <button type="button" role="menuitem" className="cuaderno__opcion cuaderno__opcion--peligro" onClick={() => void arrancar()}>
                          sí, arrancarla
                        </button>
                        <button type="button" role="menuitem" className="cuaderno__opcion" onClick={() => setConfirmando(false)}>
                          no, dejarla
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" role="menuitem" className="cuaderno__opcion" onClick={editar}>
                          <span aria-hidden="true">✏️</span> editar
                        </button>
                        <button type="button" role="menuitem" className="cuaderno__opcion" onClick={() => void alternarFijada()}>
                          <span aria-hidden="true">📌</span> {actual.fijada ? 'desfijar' : 'fijar arriba'}
                        </button>
                        <button type="button" role="menuitem" className="cuaderno__opcion cuaderno__opcion--peligro" onClick={() => setConfirmando(true)}>
                          <span aria-hidden="true">🗑️</span> arrancar hoja
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {editando && borrador ? (
            <div className="cuaderno__editor">
              <label htmlFor="nota-titulo" className="sr">
                Título
              </label>
              <input
                id="nota-titulo"
                ref={tituloRef}
                className="cuaderno__titulo cuaderno__titulo--input"
                value={borrador.titulo}
                maxLength={200}
                placeholder="título…"
                onChange={(e) => setBorrador({ ...borrador, titulo: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    areaRef.current?.focus()
                  }
                }}
              />
              <div className="indice__filtros cuaderno__proyectos" role="group" aria-label="Proyecto">
                {PROYECTOS_NOTA.map((p) => (
                  <button key={p} type="button" aria-pressed={borrador.proyecto === p} onClick={() => setBorrador({ ...borrador, proyecto: p })}>
                    {p.toLowerCase()}
                  </button>
                ))}
              </div>
              <div className="cuaderno__cuerpo">
                <label htmlFor="nota-contenido" className="sr">
                  Contenido
                </label>
                <textarea
                  id="nota-contenido"
                  ref={areaRef}
                  className="cuaderno__area"
                  value={borrador.contenido}
                  maxLength={MAX}
                  placeholder="escribe aquí… (ctrl + v pega imágenes)"
                  onChange={(e) => setBorrador({ ...borrador, contenido: e.target.value })}
                  onPaste={(e) => {
                    // Captura o imagen copiada: se sube. Si también trae texto (Word, Excel…), se pega el texto como siempre.
                    const archivos = Array.from(e.clipboardData.files)
                    if (!archivos.length || e.clipboardData.getData('text/plain')) return
                    e.preventDefault()
                    void pegarImagenes(archivos)
                  }}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes('Files')) e.preventDefault()
                  }}
                  onDrop={(e) => {
                    if (!e.dataTransfer.files.length) return
                    e.preventDefault()
                    void pegarImagenes(Array.from(e.dataTransfer.files))
                  }}
                />
              </div>
              {(() => {
                const fotos = fotosEnVista(borrador.contenido, borrador.fotos)
                if (!fotos.length && !subiendo) return null
                return (
                  <ul className="lista-limpia cuaderno__miniaturas" aria-label="Imágenes de esta hoja">
                    {fotos.map((f) => (
                      <li key={f.n}>
                        {urls[f.id] ? <img src={urls[f.id]} alt="" /> : <span className="datos">imagen</span>}
                        <span className="cuaderno__numero datos">{f.n}</span>
                        <button type="button" aria-label={`Quitar la imagen ${f.n} de la hoja`} title="quitar" onClick={() => quitarDelBorrador(f.n)}>
                          ✕
                        </button>
                      </li>
                    ))}
                    {subiendo > 0 && (
                      <li className="cuaderno__subiendo datos" aria-live="polite">
                        pegando…
                      </li>
                    )}
                  </ul>
                )
              })()}
              <div className="cuaderno__acciones">
                <button type="button" className="btn-mano" disabled={guardando || subiendo > 0} onClick={() => void guardar()}>
                  {guardando ? 'guardando…' : subiendo > 0 ? 'pegando imagen…' : 'guardar'}
                </button>
                <button type="button" className="btn-texto btn-texto--suave" onClick={() => archivoRef.current?.click()}>
                  📎 imagen
                </button>
                <input
                  ref={archivoRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  multiple
                  hidden
                  onChange={(e) => {
                    const archivos = Array.from(e.target.files ?? [])
                    e.target.value = ''
                    void pegarImagenes(archivos)
                  }}
                />
                <button type="button" className="btn-texto btn-texto--suave" onClick={cancelar}>
                  cancelar
                </button>
                <span className="datos cuaderno__ayuda">
                  {borrador.contenido.length > MAX * 0.9 ? `${borrador.contenido.length}/${MAX} · ` : ''}ctrl + s guarda · esc cancela
                </span>
              </div>
            </div>
          ) : actual ? (
            <div className="cuaderno__lectura">
              <h2 className="cuaderno__titulo">{actual.titulo || <span className="suave">sin título</span>}</h2>
              <div className="cuaderno__cuerpo" onDoubleClick={editar} title="doble clic para editar">
                {(() => {
                  const partes = partesContenido(actual.contenido)
                  // Imágenes agregadas directo en la página de Notion (sin marca en el texto): van al final.
                  const marcadas = new Set(partes.flatMap((p) => (p.tipo === 'imagen' ? [p.id] : [])))
                  const extra = (imagenesNota[actual.id]?.ids ?? []).filter((id) => !marcadas.has(id))
                  if (!partes.length && !extra.length) return <p className="cuaderno__texto suave">(hoja en blanco)</p>
                  return (
                    <>
                      {partes.map((p, i) =>
                        p.tipo === 'texto' ? (
                          <p key={`t${i}`} className="cuaderno__texto">
                            {p.texto}
                          </p>
                        ) : (
                          <Foto key={p.id} url={urls[p.id]} alt={p.alt} onFalla={() => imagenFallo(actual.id, urls[p.id])} />
                        ),
                      )}
                      {extra.map((id) => (
                        <Foto key={id} url={urls[id]} alt="imagen" onFalla={() => imagenFallo(actual.id, urls[id])} />
                      ))}
                    </>
                  )
                })()}
              </div>
              <p className="datos cuaderno__pie">
                {actual.proyecto.toLowerCase()} · editada {haceCuanto(actual.editada)}
                {actual.notionUrl && (
                  <>
                    {' · '}
                    <a href={actual.notionUrl} target="_blank" rel="noreferrer">
                      abrir en Notion
                    </a>
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="cuaderno__lectura">
              <p className="manuscrita suave" style={{ fontSize: 28, margin: '24px 0 0' }}>
                {cargando ? 'abriendo el cuaderno…' : 'elige una nota del índice o empieza una nueva.'}
              </p>
            </div>
          )}
        </article>
      </div>
    </div>
  )
}
