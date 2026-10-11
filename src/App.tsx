import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Ambito, CambiosPendiente, Datos, Pendiente } from './lib/tipos.ts'
import { actualizarAuditoria, actualizarPendiente, configurado, guardarCopia, leer, leerCopia, supabase } from './lib/api.ts'
import { auditoriaDe, construirHoy, construirSemana } from './lib/vista.ts'
import { fechaLocal, haceCuanto } from './lib/fechas.ts'
import { Papel, Ramita } from './components/Papel.tsx'
import { Login } from './components/Login.tsx'
import { Hoy } from './components/Hoy.tsx'
import { Semana } from './components/Semana.tsx'
import { HojaDetalle } from './components/HojaDetalle.tsx'
import type { AccionesTarjeta } from './components/Tarjeta.tsx'

type Ruta = 'hoy' | 'semana'
const REFRESCO_MS = 3 * 60 * 1000
const AVISO_MS = 6000

function rutaActual(): Ruta {
  return window.location.hash === '#semana' ? 'semana' : 'hoy'
}

interface Aviso {
  texto: string
  deshacer?: () => void
  error?: boolean
}

export default function App() {
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    if (!configurado) return
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!configurado) return <SinConfigurar />
  if (sesion === undefined) return <div className="mesa" aria-busy="true" />
  if (!sesion) return <Login />
  return <Escritorio correo={sesion.user.email ?? ''} />
}

function SinConfigurar() {
  return (
    <div className="mesa" style={{ display: 'grid', placeItems: 'center', padding: 16 }}>
      <Papel borde="b">
        <div style={{ width: 'min(480px, 88vw)', padding: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="marca">paperflow</span>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.5 }}>
            Falta configurar <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>. Revisa el README.
          </p>
        </div>
      </Papel>
    </div>
  )
}

function Escritorio({ correo }: { correo: string }) {
  const [ruta, setRuta] = useState<Ruta>(rutaActual)
  const [ambito, setAmbito] = useState<Ambito>('Trabajo')
  const [datos, setDatos] = useState<Datos | null>(() => leerCopia())
  const [desdeCopia, setDesdeCopia] = useState(() => leerCopia() !== null)
  const [cargando, setCargando] = useState(false)
  const [falloLectura, setFalloLectura] = useState<string | null>(null)
  const [detalleId, setDetalleId] = useState<string | null>(null)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [, setTic] = useState(0)
  const temporizador = useRef<number | undefined>(undefined)

  const hoy = fechaLocal()

  // ---- Rutas por hash
  useEffect(() => {
    const alCambiar = () => setRuta(rutaActual())
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  // ---- Lectura
  const cargar = useCallback(async (fresco = false) => {
    setCargando(true)
    try {
      const d = await leer(fresco)
      setDatos(d)
      guardarCopia(d)
      setDesdeCopia(false)
      setFalloLectura(null)
    } catch (e) {
      setFalloLectura(e instanceof Error ? e.message : 'No se pudo leer Notion')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
    const intervalo = window.setInterval(() => void cargar(), REFRESCO_MS)
    const alVolver = () => document.visibilityState === 'visible' && void cargar()
    document.addEventListener('visibilitychange', alVolver)
    // Reloj para que "actualizado hace…" no se congele.
    const reloj = window.setInterval(() => setTic((n) => n + 1), 30_000)
    return () => {
      window.clearInterval(intervalo)
      window.clearInterval(reloj)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [cargar])

  // ---- Avisos
  const mostrarAviso = useCallback((a: Aviso) => {
    window.clearTimeout(temporizador.current)
    setAviso(a)
    temporizador.current = window.setTimeout(() => setAviso(null), AVISO_MS)
  }, [])

  // ---- Mutaciones optimistas: se aplica en pantalla, se escribe en Notion y se revierte si falla.
  const cambiarPendiente = useCallback(
    async (p: Pendiente, cambios: CambiosPendiente) => {
      const local = { ...cambios } as Partial<Pendiente>
      setDatos((d) => d && { ...d, pendientes: d.pendientes.map((x) => (x.id === p.id ? { ...x, ...local } : x)) })
      try {
        await actualizarPendiente(p.id, cambios)
        setDatos((d) => {
          if (d) guardarCopia(d)
          return d
        })
      } catch (e) {
        const previo: Partial<Pendiente> = {}
        for (const k of Object.keys(cambios) as (keyof Pendiente)[]) (previo as Record<string, unknown>)[k] = p[k]
        setDatos((d) => d && { ...d, pendientes: d.pendientes.map((x) => (x.id === p.id ? { ...x, ...previo } : x)) })
        mostrarAviso({ texto: `No se guardó en Notion: ${e instanceof Error ? e.message : 'error'}`, error: true })
        throw e
      }
    },
    [],
  )

  const reabrir = useCallback(
    (p: Pendiente) => {
      void cambiarPendiente(p, { estado: 'Abierto', fechaCierre: null, cerradoPor: null }).then(
        () => mostrarAviso({ texto: `Reabierto: ${p.titulo}` }),
        () => {},
      )
    },
    [cambiarPendiente, mostrarAviso],
  )

  const acciones: AccionesTarjeta = useMemo(
    () => ({
      marcarHecho: (p) => {
        void cambiarPendiente(p, { estado: 'Hecho', fechaCierre: hoy, cerradoPor: 'Yo' }).then(
          () => mostrarAviso({ texto: `Hecho: ${p.titulo}`, deshacer: () => reabrir({ ...p, estado: 'Hecho', fechaCierre: hoy, cerradoPor: 'Yo' }) }),
          () => {},
        )
      },
      alternarHoy: (p) => {
        void cambiarPendiente(p, { enFoco: p.enFoco === hoy ? null : hoy }).catch(() => {})
      },
      abrir: (p) => setDetalleId(p.id),
      aplicarSugerencia: (audId, estado) => {
        const previo = datos?.auditorias.find((a) => a.id === audId)?.estado ?? null
        setDatos((d) => d && { ...d, auditorias: d.auditorias.map((a) => (a.id === audId ? { ...a, estado } : a)) })
        actualizarAuditoria(audId, { estado }).then(
          () => mostrarAviso({ texto: `Auditoría marcada: ${estado.toLowerCase()}` }),
          (e) => {
            setDatos((d) => d && { ...d, auditorias: d.auditorias.map((a) => (a.id === audId ? { ...a, estado: previo } : a)) })
            mostrarAviso({ texto: `No se guardó en Notion: ${e instanceof Error ? e.message : 'error'}`, error: true })
          },
        )
      },
    }),
    [cambiarPendiente, mostrarAviso, reabrir, hoy, datos],
  )

  // ---- Vistas
  const ahora = new Date()
  const vistaHoy = useMemo(() => (datos ? construirHoy(datos, ambito, hoy) : null), [datos, ambito, hoy])
  const vistaSemana = useMemo(() => (datos ? construirSemana(datos, ambito, hoy) : null), [datos, ambito, hoy])
  const detalle = detalleId && datos ? datos.pendientes.find((p) => p.id === detalleId) ?? null : null

  const proyectos = useMemo(() => {
    if (!vistaHoy) return []
    const cuenta = new Map<string, number>()
    for (const t of vistaHoy.tarjetas) {
      const nombre = t.auditoria.proyecto ?? 'sin proyecto'
      cuenta.set(nombre, (cuenta.get(nombre) ?? 0) + t.filas.length + t.espera.length)
    }
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1])
  }, [vistaHoy])

  return (
    <div className="mesa">
      <Ramita />
      <div className="marco">
        <nav className="nav-movil" aria-label="Secciones">
          <span className="marca" style={{ fontSize: 28 }}>
            paperflow
          </span>
          <a className="nav-link" href="#hoy" aria-current={ruta === 'hoy' ? 'page' : undefined}>
            hoy
          </a>
          <a className="nav-link" href="#semana" aria-current={ruta === 'semana' ? 'page' : undefined}>
            semana
          </a>
        </nav>
        <div className="columna-nav">
          <Papel as="nav" variante="rayado" borde="a" girar={-0.6} aria-label="Principal">
            <div className="nav-hoja">
              <span className="marca">paperflow</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <a className="nav-link" href="#hoy" aria-current={ruta === 'hoy' ? 'page' : undefined}>
                  hoy
                </a>
                <a className="nav-link" href="#semana" aria-current={ruta === 'semana' ? 'page' : undefined}>
                  semana
                </a>
              </div>
              {proyectos.length > 0 && (
                <div>
                  <div className="kicker" style={{ marginBottom: 4 }}>
                    proyectos · abiertos
                  </div>
                  {proyectos.map(([nombre, n]) => (
                    <div key={nombre} className="fila-proyecto">
                      <span>{nombre}</span>
                      <span className="datos">{n}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="datos" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span aria-live="polite">
                  {cargando ? 'leyendo Notion…' : datos ? `notion leído ${haceCuanto(datos.leidoEn, ahora)}` : 'sin datos aún'}
                </span>
                <button type="button" className="btn-texto" style={{ alignSelf: 'flex-start' }} disabled={cargando} onClick={() => void cargar(true)}>
                  releer
                </button>
                <button
                  type="button"
                  className="btn-texto btn-texto--suave"
                  style={{ alignSelf: 'flex-start' }}
                  title={correo}
                  onClick={() => void supabase.auth.signOut()}
                >
                  salir
                </button>
              </div>
            </div>
          </Papel>
        </div>

        {(falloLectura || desdeCopia) && datos && (
          <div className="banda" role="status" style={{ flexBasis: '100%' }}>
            {falloLectura
              ? `No pude leer Notion (${falloLectura}). Muestro la última copia, de ${haceCuanto(datos.leidoEn, ahora)}.`
              : `Mostrando la última copia guardada mientras leo Notion…`}
          </div>
        )}

        {!datos ? (
          <div className="columna-principal">
            <p className="manuscrita suave" style={{ fontSize: 26, margin: 0 }} role="status">
              {falloLectura ? `No pude leer Notion: ${falloLectura}` : 'leyendo Notion…'}
            </p>
            {falloLectura && (
              <button type="button" className="btn-mano" style={{ alignSelf: 'flex-start' }} onClick={() => void cargar(true)}>
                intentar de nuevo
              </button>
            )}
          </div>
        ) : ruta === 'semana' && vistaSemana ? (
          <Semana vista={vistaSemana} ambito={ambito} onCambiarAmbito={setAmbito} />
        ) : (
          vistaHoy && <Hoy vista={vistaHoy} ambito={ambito} onCambiarAmbito={setAmbito} acciones={acciones} onDesmarcar={reabrir} />
        )}
      </div>

      {detalle && datos && (
        <HojaDetalle
          key={detalle.id}
          p={detalle}
          auditoria={auditoriaDe(datos, detalle)}
          onCerrar={() => setDetalleId(null)}
          onGuardarEvidencia={(texto) =>
            void cambiarPendiente(detalle, { evidencia: texto }).then(() => mostrarAviso({ texto: 'Evidencia guardada' }), () => {})
          }
          onMarcarHecho={() => {
            acciones.marcarHecho(detalle)
            setDetalleId(null)
          }}
        />
      )}

      {aviso && (
        <div className="aviso" role={aviso.error ? 'alert' : 'status'}>
          <span>{aviso.texto}</span>
          {aviso.deshacer && (
            <button
              type="button"
              onClick={() => {
                aviso.deshacer?.()
                setAviso(null)
              }}
            >
              deshacer
            </button>
          )}
          <button type="button" aria-label="Cerrar aviso" onClick={() => setAviso(null)}>
            ×
          </button>
        </div>
      )}
    </div>
  )
}
