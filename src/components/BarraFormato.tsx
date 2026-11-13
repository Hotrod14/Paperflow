import type { MouseEvent, ReactNode } from 'react'
import { useEditorState, type Editor } from '@tiptap/react'
import type { Densidad } from '../../supabase/functions/_shared/mapeo.ts'
import { COLORES, type Color } from '../lib/formato.ts'

const DENSIDADES: { id: Densidad; nombre: string }[] = [
  { id: 'Compacta', nombre: 'compacta' },
  { id: 'Normal', nombre: 'normal' },
  { id: 'Amplia', nombre: 'amplia' },
]

const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const ctrl = mac ? '⌘' : 'Ctrl'

/** Que tocar un botón no le quite el foco ni la selección al editor. */
const sinRobarFoco = (e: MouseEvent) => e.preventDefault()

function Herramienta({
  etiqueta,
  atajo,
  onClick,
  activa,
  deshabilitada,
  clase = '',
  children,
}: {
  etiqueta: string
  atajo?: string
  onClick: () => void
  activa?: boolean
  deshabilitada?: boolean
  clase?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`herramienta ${clase}`}
      aria-label={etiqueta}
      aria-pressed={activa}
      disabled={deshabilitada}
      title={atajo ? `${etiqueta} · ${atajo}` : etiqueta}
      onMouseDown={sinRobarFoco}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

/** Estado de la selección para pintar los botones activos. */
function useFormato(editor: Editor) {
  return useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      parrafo: e.isActive('paragraph') && !e.isActive('bulletList') && !e.isActive('taskList') && !e.isActive('blockquote'),
      negrita: e.isActive('bold'),
      cursiva: e.isActive('italic'),
      tachado: e.isActive('strike'),
      resaltado: e.isActive('highlight'),
      codigo: e.isActive('code'),
      color: (e.getAttributes('colorNota').color as Color | undefined) ?? null,
      lista: e.isActive('bulletList'),
      casilla: e.isActive('taskList'),
      destacado: e.isActive('blockquote'),
      deshacer: e.can().undo(),
      rehacer: e.can().redo(),
    }),
  })
}

/** Énfasis y color: van en la barra y en el menú que aparece al seleccionar texto. */
export function BotonesTexto({ editor, compacto = false }: { editor: Editor; compacto?: boolean }) {
  const f = useFormato(editor)
  const c = () => editor.chain().focus()
  const pintar = (color: Color | null) => (color ? c().setMark('colorNota', { color }).run() : c().unsetMark('colorNota').run())
  return (
    <>
      <div className="herramientas__grupo" role="group" aria-label="Énfasis">
        <Herramienta etiqueta="Negrita" atajo={`${ctrl}+B`} activa={f.negrita} onClick={() => c().toggleBold().run()}>
          <b>B</b>
        </Herramienta>
        <Herramienta etiqueta="Cursiva" atajo={`${ctrl}+I`} activa={f.cursiva} onClick={() => c().toggleItalic().run()}>
          <i>I</i>
        </Herramienta>
        <Herramienta etiqueta="Tachado" atajo={`${ctrl}+Shift+S`} activa={f.tachado} onClick={() => c().toggleStrike().run()}>
          <s>S</s>
        </Herramienta>
        <Herramienta etiqueta="Resaltar" atajo={`${ctrl}+Shift+H`} activa={f.resaltado} onClick={() => c().toggleHighlight().run()}>
          <mark className="resaltado">ab</mark>
        </Herramienta>
        {!compacto && (
          <Herramienta etiqueta="Código" atajo={`${ctrl}+E`} activa={f.codigo} onClick={() => c().toggleCode().run()}>
            <code className="codigo">{'</>'}</code>
          </Herramienta>
        )}
      </div>
      <div className="herramientas__grupo" role="group" aria-label="Color del texto">
        <Herramienta etiqueta="Tinta normal" activa={!f.color} onClick={() => pintar(null)} clase="herramienta--color">
          <span className="muestra muestra--tinta" />
        </Herramienta>
        {COLORES.map((col) => (
          <Herramienta key={col} etiqueta={`Color ${col}`} activa={f.color === col} onClick={() => pintar(col)} clase="herramienta--color">
            <span className={`muestra muestra--${col}`} />
          </Herramienta>
        ))}
      </div>
    </>
  )
}

/** Barra del editor: deshacer, jerarquía, énfasis, color, listas y densidad de renglones. */
export function BarraFormato({ editor, densidad, onDensidad }: { editor: Editor; densidad: Densidad; onDensidad: (d: Densidad) => void }) {
  const f = useFormato(editor)
  const c = () => editor.chain().focus()
  return (
    <div className="cuaderno__herramientas" role="toolbar" aria-label="Formato del texto">
      <div className="herramientas__grupo" role="group" aria-label="Historial">
        <Herramienta etiqueta="Deshacer" atajo={`${ctrl}+Z`} deshabilitada={!f.deshacer} onClick={() => c().undo().run()}>
          ↶
        </Herramienta>
        <Herramienta etiqueta="Rehacer" atajo={`${ctrl}+Shift+Z`} deshabilitada={!f.rehacer} onClick={() => c().redo().run()}>
          ↷
        </Herramienta>
      </div>
      <div className="herramientas__grupo" role="group" aria-label="Jerarquía">
        <Herramienta etiqueta="Título" atajo={`${ctrl}+Alt+1`} clase="herramienta--h1" activa={f.h1} onClick={() => c().toggleHeading({ level: 1 }).run()}>
          Título
        </Herramienta>
        <Herramienta etiqueta="Subtítulo" atajo={`${ctrl}+Alt+2`} clase="herramienta--h2" activa={f.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>
          Subtítulo
        </Herramienta>
        <Herramienta etiqueta="Sección" atajo={`${ctrl}+Alt+3`} clase="herramienta--h3" activa={f.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>
          SECCIÓN
        </Herramienta>
        <Herramienta etiqueta="Texto normal" atajo={`${ctrl}+Alt+0`} activa={f.parrafo} onClick={() => c().setParagraph().run()}>
          Texto
        </Herramienta>
      </div>
      <BotonesTexto editor={editor} />
      <div className="herramientas__grupo" role="group" aria-label="Listas y bloques">
        <Herramienta etiqueta="Lista" atajo={`${ctrl}+Shift+8`} activa={f.lista} onClick={() => c().toggleBulletList().run()}>
          •&thinsp;—
        </Herramienta>
        <Herramienta etiqueta="Casillas" atajo={`${ctrl}+Shift+9`} activa={f.casilla} onClick={() => c().toggleTaskList().run()}>
          ☐
        </Herramienta>
        <Herramienta etiqueta="Destacado" atajo={`${ctrl}+Shift+B`} activa={f.destacado} onClick={() => c().toggleBlockquote().run()}>
          ❝
        </Herramienta>
        <Herramienta etiqueta="Línea separadora" onClick={() => c().setHorizontalRule().run()}>
          ―
        </Herramienta>
        <Herramienta etiqueta="Quitar formato" onClick={() => c().unsetAllMarks().clearNodes().run()}>
          <span className="herramienta__borrar">T</span>
        </Herramienta>
      </div>
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
    </div>
  )
}
