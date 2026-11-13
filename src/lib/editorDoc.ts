// Conversión entre el formato de la nota (texto con marcas, el que se guarda en Notion)
// y el documento del editor visual (JSON de TipTap/ProseMirror).
// Así la persona edita viendo el formato, pero en Notion sigue quedando texto legible.
import type { JSONContent } from '@tiptap/core'
import { marcaImagen, partesContenido, type OrigenImagen } from '../../supabase/functions/_shared/imagenes.ts'
import { bloqueDe, enLinea, type Nodo } from './formato.ts'

type Marca = { type: string; attrs?: Record<string, unknown> }

// ---- Texto con marcas → documento

function textoConMarcas(nodos: Nodo[], marcas: Marca[] = []): JSONContent[] {
  const salida: JSONContent[] = []
  const con = (m: Marca, hijos: Nodo[]) =>
    salida.push(...textoConMarcas(hijos, [...marcas.filter((x) => x.type !== m.type), m]))
  for (const n of nodos) {
    if (typeof n === 'string') {
      if (n) salida.push({ type: 'text', text: n, ...(marcas.length ? { marks: marcas } : {}) })
      continue
    }
    switch (n.tipo) {
      case 'b':
        con({ type: 'bold' }, n.hijos)
        break
      case 'i':
        con({ type: 'italic' }, n.hijos)
        break
      case 's':
        con({ type: 'strike' }, n.hijos)
        break
      case 'mark':
        con({ type: 'highlight' }, n.hijos)
        break
      case 'color':
        con({ type: 'colorNota', attrs: { color: n.color } }, n.hijos)
        break
      case 'code':
        // El código no lleva otras marcas en el editor.
        if (n.texto) salida.push({ type: 'text', text: n.texto, marks: [{ type: 'code' }] })
        break
    }
  }
  return salida
}

const enLineaDoc = (texto: string): JSONContent[] | undefined => {
  const c = textoConMarcas(enLinea(texto))
  return c.length ? c : undefined
}
const parrafo = (texto: string): JSONContent => ({ type: 'paragraph', ...(texto ? { content: enLineaDoc(texto) } : {}) })

export function aDoc(contenido: string): JSONContent {
  const bloques: JSONContent[] = []
  for (const p of partesContenido(contenido)) {
    if (p.tipo === 'imagen') {
      bloques.push({ type: 'fotoNota', attrs: { origen: p.origen, id: p.id, alt: p.alt } })
      continue
    }
    let grupo: JSONContent | null = null
    for (const linea of p.texto.split('\n')) {
      const b = bloqueDe(linea)
      const tipoGrupo = b.tipo === 'lista' ? 'bulletList' : b.tipo === 'casilla' ? 'taskList' : b.tipo === 'cita' ? 'blockquote' : null
      if (tipoGrupo) {
        if (!grupo || grupo.type !== tipoGrupo) {
          grupo = { type: tipoGrupo, content: [] }
          bloques.push(grupo)
        }
        if (tipoGrupo === 'bulletList') grupo.content!.push({ type: 'listItem', content: [parrafo(b.texto)] })
        else if (tipoGrupo === 'taskList') grupo.content!.push({ type: 'taskItem', attrs: { checked: Boolean(b.hecho) }, content: [parrafo(b.texto)] })
        else grupo.content!.push(parrafo(b.texto))
        continue
      }
      grupo = null
      if (b.tipo === 'separador') bloques.push({ type: 'horizontalRule' })
      else if (b.tipo === 'h1' || b.tipo === 'h2' || b.tipo === 'h3') {
        const contenidoTitulo = enLineaDoc(b.texto)
        bloques.push({ type: 'heading', attrs: { level: Number(b.tipo[1]) }, ...(contenidoTitulo ? { content: contenidoTitulo } : {}) })
      } else bloques.push(parrafo(b.texto))
    }
  }
  if (!bloques.length) bloques.push({ type: 'paragraph' })
  return { type: 'doc', content: bloques }
}

// ---- Documento → texto con marcas

/** Orden de anidado al escribir las marcas: el color va afuera, el código adentro. */
const ORDEN = ['colorNota', 'bold', 'italic', 'strike', 'highlight', 'code'] as const
type Tramo = { texto: string; marcas: Marca[] }

const valorMarca = (t: Tramo, tipo: string): string | null => {
  const m = t.marcas.find((x) => x.type === tipo)
  if (!m) return null
  return tipo === 'colorNota' ? String(m.attrs?.color ?? '') || null : '1'
}

const DELIM: Record<string, [string, string]> = {
  bold: ['**', '**'],
  italic: ['_', '_'],
  strike: ['~~', '~~'],
  highlight: ['==', '=='],
  code: ['`', '`'],
}

/** Agrupa tramos vecinos con la misma marca para escribirla una sola vez. */
function escribirTramos(tramos: Tramo[], nivel = 0): string {
  if (nivel === ORDEN.length) return tramos.map((t) => t.texto).join('')
  const tipo = ORDEN[nivel]
  let salida = ''
  for (let i = 0; i < tramos.length; ) {
    const v = valorMarca(tramos[i], tipo)
    let j = i
    while (j < tramos.length && valorMarca(tramos[j], tipo) === v) j++
    const dentro = escribirTramos(tramos.slice(i, j), nivel + 1)
    if (!v || !dentro) salida += dentro
    else if (tipo === 'colorNota') salida += `{${v}:${dentro}}`
    else salida += DELIM[tipo][0] + dentro + DELIM[tipo][1]
    i = j
  }
  return salida
}

function enLineaTexto(contenido: JSONContent[] | undefined): string {
  const tramos: Tramo[] = (contenido ?? [])
    .filter((n) => n.type === 'text' && n.text)
    .map((n) => ({ texto: n.text!, marcas: (n.marks ?? []) as Marca[] }))
  return escribirTramos(tramos)
}

function itemLineas(item: JSONContent, prefijo: string, lineas: string[]) {
  const hijos = item.content ?? []
  if (!hijos.length) lineas.push(prefijo)
  for (const h of hijos) {
    if (h.type === 'paragraph' || h.type === 'heading') lineas.push(prefijo + enLineaTexto(h.content))
    else bloqueLineas(h, lineas) // listas anidadas: el formato es plano, quedan como ítems seguidos
  }
}

function bloqueLineas(b: JSONContent, lineas: string[]) {
  switch (b.type) {
    case 'paragraph':
      lineas.push(enLineaTexto(b.content))
      break
    case 'heading':
      lineas.push(`${'#'.repeat(Math.min(3, Math.max(1, Number(b.attrs?.level) || 1)))} ${enLineaTexto(b.content)}`)
      break
    case 'bulletList':
      for (const li of b.content ?? []) itemLineas(li, '- ', lineas)
      break
    case 'taskList':
      for (const ti of b.content ?? []) itemLineas(ti, ti.attrs?.checked ? '- [x] ' : '- [ ] ', lineas)
      break
    case 'blockquote': {
      const dentro: string[] = []
      for (const h of b.content ?? []) bloqueLineas(h, dentro)
      for (const l of dentro) lineas.push(`> ${l.replace(/^(#{1,3} |- \[[ xX]\] |- |> )/, '')}`)
      break
    }
    case 'horizontalRule':
      lineas.push('---')
      break
    case 'fotoNota':
      lineas.push(marcaImagen(b.attrs?.origen as OrigenImagen, String(b.attrs?.id), String(b.attrs?.alt ?? 'imagen')))
      break
    default:
      for (const h of b.content ?? []) bloqueLineas(h, lineas)
  }
}

export function aTexto(doc: JSONContent): string {
  const lineas: string[] = []
  for (const b of doc.content ?? []) bloqueLineas(b, lineas)
  // El editor siempre deja un párrafo vacío al final: no se guarda.
  return lineas.join('\n').replace(/\n+$/, '')
}
