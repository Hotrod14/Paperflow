import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as KeyboardEventReact } from 'react'
import type { Nota } from '../lib/tipos.ts'
import { actualizarNota, crearNota, eliminarNota, guardarCopiaNotas, leerCopiaNotas, leerNotas, restaurarNota } from '../lib/api.ts'
import { fechaCorta, filtrarNotas, ordenarNotas, resumenNota } from '../lib/cuaderno.ts'
import { fechaLarga, haceCuanto } from '../lib/fechas.ts'
import { abrirTarea, arrancarHoja, pasarHoja, trazoLapiz } from '../lib/sonido.ts'
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
type Borrador = { titulo: string; contenido: string; proyecto: string; fijada: boolean }

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
        (borrador.titulo !== actual.titulo || borrador.contenido !== actual.contenido || borrador.proyecto !== actual.proyecto))

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
    setBorrador({ titulo: '', contenido: '', proyecto: filtro ?? 'General', fijada: false })
    setEditando(true)
    setMenu(false)
    setVista('hoja')
  }

  function editar() {
    if (!actual) return
    trazoLapiz()
    setBorrador({ titulo: actual.titulo, contenido: actual.contenido, proyecto: actual.proyecto, fijada: actual.fijada })
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
    if (seleccion === NUEVA) {
      if (!borrador.titulo.trim() && !borrador.contenido.trim()) {
        cancelar()
        return
      }
      setGuardando(true)
      try {
        const creada = await crearNota(borrador)
        cambiarNotas((n) => [creada, ...n])
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
    const cambios: Partial<Borrador> = {}
    if (borrador.titulo !== actual.titulo) cambios.titulo = borrador.titulo
    if (borrador.contenido !== actual.contenido) cambios.contenido = borrador.contenido
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
                  placeholder="escribe aquí…"
                  onChange={(e) => setBorrador({ ...borrador, contenido: e.target.value })}
                />
              </div>
              <div className="cuaderno__acciones">
                <button type="button" className="btn-mano" disabled={guardando} onClick={() => void guardar()}>
                  {guardando ? 'guardando…' : 'guardar'}
                </button>
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
                {actual.contenido ? <p className="cuaderno__texto">{actual.contenido}</p> : <p className="cuaderno__texto suave">(hoja en blanco)</p>}
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
