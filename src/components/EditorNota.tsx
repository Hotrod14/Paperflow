// Editor visual del cuaderno: se escribe viendo el formato (sin marcas a la vista).
// Por dentro guarda el mismo texto con marcas que ya usa Notion (ver lib/editorDoc.ts).
import { createContext, forwardRef, useContext, useEffect, useImperativeHandle, useRef } from 'react'
import { Mark, Node, mergeAttributes } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, type NodeViewProps } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Placeholder } from '@tiptap/extensions'
import { aDoc, aTexto } from '../lib/editorDoc.ts'
import { COLORES } from '../lib/formato.ts'
import { esImagen } from '../lib/imagen.ts'
import type { Densidad } from '../../supabase/functions/_shared/mapeo.ts'
import { BarraFormato, BotonesTexto } from './BarraFormato.tsx'
import { Foto } from './Foto.tsx'

// ---- Extensiones propias

/** Color del texto con las tintas del cuaderno ({rojo:…} en Notion). */
const ColorNota = Mark.create({
  name: 'colorNota',
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (el) => {
          const c = el.getAttribute('data-color')
          return c && (COLORES as readonly string[]).includes(c) ? c : null
        },
        renderHTML: (a) => (a.color ? { 'data-color': a.color, class: `tinta-${a.color}` } : {}),
      },
    }
  },
  parseHTML: () => [{ tag: 'span[data-color]' }],
  renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes), 0],
})

/** URL de cada imagen (blob recién pegada o enlace temporal de Notion). */
const UrlsFotos = createContext<Record<string, string>>({})

function FotoEnEditor({ node, deleteNode, selected }: NodeViewProps) {
  const urls = useContext(UrlsFotos)
  const id = String(node.attrs.id)
  return (
    <NodeViewWrapper className={`foto-editor${selected ? ' es-seleccionada' : ''}`} data-drag-handle="">
      <Foto url={urls[id]} alt={String(node.attrs.alt ?? 'imagen')} />
      <button type="button" className="foto-editor__quitar" contentEditable={false} aria-label="Quitar imagen de la hoja" title="quitar imagen" onClick={deleteNode}>
        ✕
      </button>
    </NodeViewWrapper>
  )
}

/** Imagen pegada en la hoja (![imagen](bloque:…) en Notion). */
const FotoNota = Node.create({
  name: 'fotoNota',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes: () => ({ origen: { default: 'bloque' }, id: { default: '' }, alt: { default: 'imagen' } }),
  parseHTML: () => [{ tag: 'figure[data-foto]' }],
  renderHTML: ({ HTMLAttributes }) => ['figure', mergeAttributes(HTMLAttributes, { 'data-foto': '' })],
  addNodeView() {
    return ReactNodeViewRenderer(FotoEnEditor)
  },
})

// ---- Componente

export interface EditorNotaApi {
  /** Pega una imagen ya subida donde está el cursor. */
  insertarImagen: (archivo: string) => void
  enfocar: () => void
}

interface Props {
  inicial: string
  urls: Record<string, string>
  densidad: Densidad
  onDensidad: (d: Densidad) => void
  onCambio: (texto: string) => void
  onImagenes: (archivos: File[]) => void
}

const EditorNota = forwardRef<EditorNotaApi, Props>(function EditorNota({ inicial, urls, densidad, onDensidad, onCambio, onImagenes }, ref) {
  // Los callbacks cambian en cada render: el editor los lee siempre frescos.
  const alCambiar = useRef(onCambio)
  const alPegar = useRef(onImagenes)
  useEffect(() => {
    alCambiar.current = onCambio
    alPegar.current = onImagenes
  })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        orderedList: false,
        link: false,
        underline: false,
        hardBreak: false,
      }),
      Highlight.configure({ HTMLAttributes: { class: 'resaltado' } }),
      TaskList,
      TaskItem.configure({
        nested: false,
        a11y: { checkboxLabel: (node, marcada) => `${marcada ? 'Desmarcar' : 'Marcar'}: ${node.textContent || 'casilla vacía'}` },
      }),
      Placeholder.configure({ placeholder: 'Escribe aquí… (pega imágenes con Ctrl + V)' }),
      ColorNota,
      FotoNota,
    ],
    content: aDoc(inicial),
    immediatelyRender: true,
    editorProps: {
      attributes: { class: 'editor-nota', 'aria-label': 'Contenido de la nota', spellcheck: 'true' },
      // La barra fija ocupa la parte de arriba: el cursor nunca queda escondido bajo ella.
      scrollMargin: { top: 150, bottom: 48, left: 0, right: 0 },
      scrollThreshold: { top: 150, bottom: 48, left: 0, right: 0 },
      handlePaste: (_view, e) => {
        const archivos = Array.from(e.clipboardData?.files ?? []).filter(esImagen)
        // Si también trae texto (Word, Excel…), se pega el texto como siempre.
        if (!archivos.length || e.clipboardData?.getData('text/plain')) return false
        alPegar.current(archivos)
        return true
      },
      handleDrop: (view, e, _slice, movido) => {
        if (movido) return false
        const archivos = Array.from(e.dataTransfer?.files ?? []).filter(esImagen)
        if (!archivos.length) return false
        const pos = view.posAtCoords({ left: e.clientX, top: e.clientY })
        if (pos) view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(pos.pos))))
        alPegar.current(archivos)
        return true
      },
    },
    onUpdate: ({ editor: e }) => alCambiar.current(aTexto(e.getJSON())),
  })

  useImperativeHandle(
    ref,
    () => ({
      insertarImagen: (archivo) => {
        editor?.chain().focus().insertContent({ type: 'fotoNota', attrs: { origen: 'archivo', id: archivo, alt: 'imagen' } }).run()
      },
      enfocar: () => editor?.commands.focus('end'),
    }),
    [editor],
  )

  if (!editor) return null
  return (
    <UrlsFotos.Provider value={urls}>
      <BarraFormato editor={editor} densidad={densidad} onDensidad={onDensidad} />
      <BubbleMenu
        editor={editor}
        className="papel menu-flotante"
        options={{ placement: 'top', offset: 8 }}
        shouldShow={({ editor: e, from, to }) => from !== to && !e.isActive('fotoNota') && !e.isActive('code')}
      >
        <BotonesTexto editor={editor} compacto />
      </BubbleMenu>
      <div className="cuaderno__cuerpo">
        <EditorContent editor={editor} />
      </div>
    </UrlsFotos.Provider>
  )
})

export default EditorNota
