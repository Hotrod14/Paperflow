import type { MouseEvent, ReactNode } from 'react'
import type { Densidad } from '../../supabase/functions/_shared/mapeo.ts'
import { COLORES, type Color } from '../lib/formato.ts'

const DENSIDADES: { id: Densidad; nombre: string }[] = [
  { id: 'Compacta', nombre: 'compacta' },
  { id: 'Normal', nombre: 'normal' },
  { id: 'Amplia', nombre: 'amplia' },
]

const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const ctrl = mac ? '⌘' : 'Ctrl'

/** Que tocar un botón no le quite el foco (ni la selección) al área de texto. */
const sinRobarFoco = (e: MouseEvent) => e.preventDefault()

function Herramienta({
  etiqueta,
  atajo,
  onClick,
  activa,
  clase = '',
  children,
}: {
  etiqueta: string
  atajo?: string
  onClick: () => void
  activa?: boolean
  clase?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`herramienta ${clase}`}
      aria-label={etiqueta}
      aria-pressed={activa}
      title={atajo ? `${etiqueta} · ${atajo}` : etiqueta}
      onMouseDown={sinRobarFoco}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

/** Estuche de herramientas del editor: jerarquía, énfasis, color, listas, densidad y vista previa. */
export function BarraFormato({
  onBloque,
  onMarca,
  onColor,
  onSeparador,
  densidad,
  onDensidad,
  previa,
  onPrevia,
}: {
  onBloque: (prefijo: string) => void
  onMarca: (marca: string) => void
  onColor: (color: Color | null) => void
  onSeparador: () => void
  densidad: Densidad
  onDensidad: (d: Densidad) => void
  previa: boolean
  onPrevia: () => void
}) {
  return (
    <div className="cuaderno__herramientas" role="toolbar" aria-label="Formato del texto">
      {!previa && (
        <>
          <div className="herramientas__grupo" role="group" aria-label="Jerarquía">
            <Herramienta etiqueta="Título" atajo={`${ctrl}+Alt+1`} clase="herramienta--h1" onClick={() => onBloque('# ')}>
              Título
            </Herramienta>
            <Herramienta etiqueta="Subtítulo" atajo={`${ctrl}+Alt+2`} clase="herramienta--h2" onClick={() => onBloque('## ')}>
              Subtítulo
            </Herramienta>
            <Herramienta etiqueta="Sección" atajo={`${ctrl}+Alt+3`} clase="herramienta--h3" onClick={() => onBloque('### ')}>
              SECCIÓN
            </Herramienta>
          </div>
          <div className="herramientas__grupo" role="group" aria-label="Énfasis">
            <Herramienta etiqueta="Negrita" atajo={`${ctrl}+B`} onClick={() => onMarca('**')}>
              <b>B</b>
            </Herramienta>
            <Herramienta etiqueta="Cursiva" atajo={`${ctrl}+I`} onClick={() => onMarca('*')}>
              <i>I</i>
            </Herramienta>
            <Herramienta etiqueta="Tachado" atajo={`${ctrl}+Shift+X`} onClick={() => onMarca('~~')}>
              <s>S</s>
            </Herramienta>
            <Herramienta etiqueta="Resaltar" atajo={`${ctrl}+Shift+H`} onClick={() => onMarca('==')}>
              <mark className="resaltado">ab</mark>
            </Herramienta>
            <Herramienta etiqueta="Código" onClick={() => onMarca('`')}>
              <code className="codigo">{'</>'}</code>
            </Herramienta>
          </div>
          <div className="herramientas__grupo" role="group" aria-label="Color del texto">
            <Herramienta etiqueta="Sin color (tinta)" onClick={() => onColor(null)} clase="herramienta--color">
              <span className="muestra muestra--tinta" />
            </Herramienta>
            {COLORES.map((c) => (
              <Herramienta key={c} etiqueta={`Color ${c}`} onClick={() => onColor(c)} clase="herramienta--color">
                <span className={`muestra muestra--${c}`} />
              </Herramienta>
            ))}
          </div>
          <div className="herramientas__grupo" role="group" aria-label="Listas y bloques">
            <Herramienta etiqueta="Lista" onClick={() => onBloque('- ')}>
              •&thinsp;—
            </Herramienta>
            <Herramienta etiqueta="Casilla" onClick={() => onBloque('- [ ] ')}>
              ☐
            </Herramienta>
            <Herramienta etiqueta="Destacado" onClick={() => onBloque('> ')}>
              ❝
            </Herramienta>
            <Herramienta etiqueta="Línea separadora" onClick={onSeparador}>
              ―
            </Herramienta>
          </div>
        </>
      )}
      <div className="herramientas__grupo herramientas__densidad" role="group" aria-label="Separación de renglones">
        <span className="datos" aria-hidden="true">
          renglones
        </span>
        {DENSIDADES.map((d) => (
          <Herramienta key={d.id} etiqueta={`Renglones ${d.nombre}`} activa={densidad === d.id} onClick={() => onDensidad(d.id)}>
            {d.nombre}
          </Herramienta>
        ))}
      </div>
      <Herramienta etiqueta={previa ? 'Volver a escribir' : 'Vista previa'} activa={previa} clase="herramienta--previa" onClick={onPrevia}>
        {previa ? '✏️ escribir' : '👁 vista previa'}
      </Herramienta>
    </div>
  )
}
