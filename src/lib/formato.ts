// Formato del cuaderno: marcas simples dentro del texto, legibles también en Notion.
//
// Por línea (jerarquía):
//   # Título          ## Subtítulo          ### Sección
//   - viñeta          - [ ] casilla / - [x] casilla hecha
//   > destacado       ---  separador
// Dentro de la línea:
//   **negrita**  _cursiva_ (o *cursiva*)  ~~tachado~~  ==resaltado==  `código`  {rojo:texto en color}
//
// Todo es lógica pura (sin DOM) para poder probarla.

export const COLORES = ['rojo', 'azul', 'verde', 'naranjo', 'morado', 'gris'] as const
export type Color = (typeof COLORES)[number]

export type TipoBloque = 'h1' | 'h2' | 'h3' | 'lista' | 'casilla' | 'cita' | 'separador' | 'parrafo'
export interface Bloque {
  tipo: TipoBloque
  texto: string
  hecho?: boolean
}

const PREFIJOS: [RegExp, TipoBloque][] = [
  [/^### /, 'h3'],
  [/^## /, 'h2'],
  [/^# /, 'h1'],
  [/^- \[[ xX]\] /, 'casilla'],
  [/^- /, 'lista'],
  [/^> /, 'cita'],
]
/** Cualquier marca de bloque al inicio de una línea. */
const PREFIJO_BLOQUE = /^(#{1,3} |- \[[ xX]\] |- |> )/

export function bloqueDe(linea: string): Bloque {
  if (/^-{3,}\s*$/.test(linea)) return { tipo: 'separador', texto: '' }
  for (const [re, tipo] of PREFIJOS) {
    const m = linea.match(re)
    if (m) return { tipo, texto: linea.slice(m[0].length), ...(tipo === 'casilla' ? { hecho: /\[[xX]\]/.test(m[0]) } : {}) }
  }
  return { tipo: 'parrafo', texto: linea }
}

export const bloques = (texto: string): Bloque[] => texto.split('\n').map(bloqueDe)

// ---- Dentro de la línea

export type Nodo =
  | string
  | { tipo: 'b' | 'i' | 's' | 'mark'; hijos: Nodo[] }
  | { tipo: 'code'; texto: string }
  | { tipo: 'color'; color: Color; hijos: Nodo[] }

const INLINE: { re: RegExp; crear: (m: RegExpExecArray) => Nodo }[] = [
  { re: /`([^`\n]+)`/, crear: (m) => ({ tipo: 'code', texto: m[1] }) },
  { re: /\*\*([^\n]+?)\*\*/, crear: (m) => ({ tipo: 'b', hijos: enLinea(m[1]) }) },
  { re: /\*([^*\n]+)\*/, crear: (m) => ({ tipo: 'i', hijos: enLinea(m[1]) }) },
  // Cursiva con guion bajo solo si no está pegada a letras: así "user_id" no se vuelve cursiva.
  { re: /(?<![\p{L}\p{N}_])_([^_\n]+?)_(?![\p{L}\p{N}_])/u, crear: (m) => ({ tipo: 'i', hijos: enLinea(m[1]) }) },
  { re: /~~([^\n]+?)~~/, crear: (m) => ({ tipo: 's', hijos: enLinea(m[1]) }) },
  { re: /==([^\n]+?)==/, crear: (m) => ({ tipo: 'mark', hijos: enLinea(m[1]) }) },
  {
    re: new RegExp(`\\{(${COLORES.join('|')}):([^{}\\n]+)\\}`),
    crear: (m) => ({ tipo: 'color', color: m[1] as Color, hijos: enLinea(m[2]) }),
  },
]

/** Convierte una línea en nodos con formato. Gana la marca que empieza antes (y, a igual inicio, la más larga). */
export function enLinea(texto: string): Nodo[] {
  const nodos: Nodo[] = []
  let resto = texto
  while (resto) {
    let mejor: { m: RegExpExecArray; crear: (m: RegExpExecArray) => Nodo } | null = null
    for (const { re, crear } of INLINE) {
      const m = re.exec(resto)
      if (m && (!mejor || m.index < mejor.m.index || (m.index === mejor.m.index && m[0].length > mejor.m[0].length))) mejor = { m, crear }
    }
    if (!mejor) {
      nodos.push(resto)
      break
    }
    if (mejor.m.index > 0) nodos.push(resto.slice(0, mejor.m.index))
    nodos.push(mejor.crear(mejor.m))
    resto = resto.slice(mejor.m.index + mejor.m[0].length)
  }
  return nodos
}

/** Texto sin marcas de formato: para buscar y para el resumen del índice. */
export function sinFormato(texto: string): string {
  return texto
    .split('\n')
    .map((l) => (/^-{3,}\s*$/.test(l) ? '' : l.replace(PREFIJO_BLOQUE, '')))
    .join('\n')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\*\*([^\n]+?)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/(?<![\p{L}\p{N}_])_([^_\n]+?)_(?![\p{L}\p{N}_])/gu, '$1')
    .replace(/~~([^\n]+?)~~/g, '$1')
    .replace(/==([^\n]+?)==/g, '$1')
    .replace(new RegExp(`\\{(?:${COLORES.join('|')}):([^{}\\n]+)\\}`, 'g'), '$1')
}

/** Marca o desmarca la casilla número `n` (contando desde 0, en el orden del texto). */
export function alternarCasilla(t: string, n: number): string {
  let i = -1
  return t
    .split('\n')
    .map((l) => {
      const m = l.match(/^- \[([ xX])\] /)
      if (!m) return l
      i++
      if (i !== n) return l
      return `- [${m[1] === ' ' ? 'x' : ' '}] ${l.slice(m[0].length)}`
    })
    .join('\n')
}
