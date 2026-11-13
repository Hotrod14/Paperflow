import type { ReactNode } from 'react'
import { partesContenido } from '../../supabase/functions/_shared/imagenes.ts'
import { bloqueDe, enLinea, type Nodo } from '../lib/formato.ts'

/** Dibuja los nodos de una línea con su formato. */
function Linea({ nodos }: { nodos: Nodo[] }) {
  return (
    <>
      {nodos.map((n, i): ReactNode => {
        if (typeof n === 'string') return n
        switch (n.tipo) {
          case 'b':
            return <strong key={i}><Linea nodos={n.hijos} /></strong>
          case 'i':
            return <em key={i}><Linea nodos={n.hijos} /></em>
          case 's':
            return <s key={i}><Linea nodos={n.hijos} /></s>
          case 'mark':
            return <mark key={i} className="resaltado"><Linea nodos={n.hijos} /></mark>
          case 'code':
            return <code key={i} className="codigo">{n.texto}</code>
          case 'color':
            return <span key={i} className={`tinta-${n.color}`}><Linea nodos={n.hijos} /></span>
        }
      })}
    </>
  )
}

/**
 * La hoja leída: texto con jerarquía (títulos, listas, casillas, destacados, separadores),
 * formato dentro de la línea e imágenes pegadas, todo alineado a los renglones.
 */
export function HojaFormateada({
  contenido,
  extra = [],
  foto,
  onCasilla,
}: {
  contenido: string
  /** Imágenes de la página que no están marcadas en el texto: van al final. */
  extra?: string[]
  /** Dibuja una imagen (la pone Cuaderno, que maneja las URL). */
  foto: (id: string, alt: string) => ReactNode
  /** Marca o desmarca la casilla n (en el orden del texto). Sin esto, las casillas son de solo lectura. */
  onCasilla?: (n: number) => void
}) {
  const partes = partesContenido(contenido)
  if (!partes.length && !extra.length) return <p className="cuaderno__texto suave">(hoja en blanco)</p>

  let casilla = -1
  return (
    <>
      {partes.map((p, i) => {
        if (p.tipo === 'imagen') return <div key={p.id}>{foto(p.id, p.alt)}</div>
        return (
          <div key={`t${i}`} className="cuaderno__texto">
            {p.texto.split('\n').map((linea, j) => {
              const b = bloqueDe(linea)
              const k = `${i}-${j}`
              switch (b.tipo) {
                case 'separador':
                  return <hr key={k} className="bloque bloque--separador" />
                case 'h1':
                  return <h3 key={k} className="bloque bloque--h1"><Linea nodos={enLinea(b.texto)} /></h3>
                case 'h2':
                  return <h4 key={k} className="bloque bloque--h2"><Linea nodos={enLinea(b.texto)} /></h4>
                case 'h3':
                  return <h5 key={k} className="bloque bloque--h3"><Linea nodos={enLinea(b.texto)} /></h5>
                case 'lista':
                  return <div key={k} className="bloque bloque--lista"><Linea nodos={enLinea(b.texto)} /></div>
                case 'cita':
                  return <div key={k} className="bloque bloque--cita"><Linea nodos={enLinea(b.texto)} /></div>
                case 'casilla': {
                  casilla++
                  const n = casilla
                  return (
                    <div key={k} className={`bloque bloque--casilla${b.hecho ? ' es-hecho' : ''}`}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={b.hecho}
                        aria-label={b.hecho ? 'Desmarcar' : 'Marcar como hecho'}
                        className="casilla-nota"
                        disabled={!onCasilla}
                        onClick={() => onCasilla?.(n)}
                        onDoubleClick={(e) => e.stopPropagation()}
                      >
                        {b.hecho ? '✓' : ''}
                      </button>
                      <span><Linea nodos={enLinea(b.texto)} /></span>
                    </div>
                  )
                }
                default:
                  return (
                    <div key={k} className="bloque">
                      {b.texto ? <Linea nodos={enLinea(b.texto)} /> : ' '}
                    </div>
                  )
              }
            })}
          </div>
        )
      })}
      {extra.map((id) => (
        <div key={id}>{foto(id, 'imagen')}</div>
      ))}
    </>
  )
}
