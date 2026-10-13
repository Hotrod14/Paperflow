import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { FONDOS, type Fondo, type Tema } from '../lib/tema.ts'
import { SelectorTema } from './SelectorTema.tsx'

/**
 * Menú de la persona: perfil, tema y ajustes de fondo.
 * Se abre con el círculo de la inicial; se cierra con Escape o tocando fuera.
 */
export function MenuUsuario({
  correo,
  tema,
  onTema,
  fondo,
  onFondo,
  onSalir,
  alinear = 'izquierda',
}: {
  correo: string
  tema: Tema
  onTema: (t: Tema) => void
  fondo: Fondo
  onFondo: (f: Fondo) => void
  onSalir: () => void
  alinear?: 'izquierda' | 'derecha'
}) {
  const [abierto, setAbierto] = useState(false)
  const [pos, setPos] = useState<CSSProperties>({})
  const raiz = useRef<HTMLDivElement>(null)
  const hoja = useRef<HTMLDivElement>(null)
  const boton = useRef<HTMLButtonElement>(null)
  const inicial = (correo.trim()[0] ?? '·').toUpperCase()

  // La hoja va en una capa propia (portal): la hoja de navegación está girada y recorta su contenido.
  useLayoutEffect(() => {
    if (!abierto) return
    const ubicar = () => {
      const r = boton.current?.getBoundingClientRect()
      if (!r) return
      setPos(
        alinear === 'derecha'
          ? { top: r.bottom + 8, right: Math.max(16, window.innerWidth - r.right) }
          : { top: r.bottom + 8, left: Math.max(16, r.left) },
      )
    }
    ubicar()
    window.addEventListener('resize', ubicar)
    window.addEventListener('scroll', ubicar, true)
    return () => {
      window.removeEventListener('resize', ubicar)
      window.removeEventListener('scroll', ubicar, true)
    }
  }, [abierto, alinear])

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: PointerEvent) => {
      const n = e.target as Node
      if (!raiz.current?.contains(n) && !hoja.current?.contains(n)) setAbierto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAbierto(false)
        boton.current?.focus()
      }
    }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  return (
    <div className="menu" ref={raiz}>
      <button
        ref={boton}
        type="button"
        className="menu__boton"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label="Menú: perfil, tema y ajustes"
        title="Perfil, tema y ajustes"
        onClick={() => setAbierto(!abierto)}
      >
        <span className="avatar" aria-hidden="true">
          {inicial}
        </span>
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" className="menu__flecha">
          <path d="M2 4.5l4 3.5 4-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {abierto &&
        createPortal(
        <div ref={hoja} className="papel menu__hoja" style={pos} role="dialog" aria-label="Perfil, tema y ajustes">
          <section className="menu__seccion" aria-labelledby="menu-perfil">
            <h2 id="menu-perfil" className="kicker">
              perfil
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="avatar avatar--grande" aria-hidden="true">
                {inicial}
              </span>
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 16, overflowWrap: 'anywhere' }}>{correo}</span>
                <span className="datos">entras con enlace mágico</span>
              </div>
            </div>
            <button type="button" className="btn-texto btn-texto--suave" style={{ alignSelf: 'flex-start' }} onClick={onSalir}>
              cerrar sesión
            </button>
          </section>

          <section className="menu__seccion" aria-labelledby="menu-tema">
            <h2 id="menu-tema" className="kicker">
              tema
            </h2>
            <SelectorTema tema={tema} onCambiar={onTema} />
          </section>

          <section className="menu__seccion" aria-labelledby="menu-ajustes">
            <h2 id="menu-ajustes" className="kicker">
              ajustes · fondo de la mesa
            </h2>
            <div role="group" aria-labelledby="menu-ajustes" className="fondos">
              {FONDOS.map((f) => (
                <button key={f.id} type="button" className="fondo" aria-pressed={fondo === f.id} onClick={() => onFondo(f.id)}>
                  <span className="fondo__muestra" data-muestra={f.id} style={{ background: f.muestra[tema] }} aria-hidden="true">
                    <span className="fondo__hoja" />
                  </span>
                  <span className="fondo__nombre">{f.nombre}</span>
                </button>
              ))}
            </div>
          </section>
        </div>,
          document.body,
        )}
    </div>
  )
}
