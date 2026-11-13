// Formato del cuaderno: marcas simples dentro del texto, legibles también en Notion.
//
// Por línea (jerarquía):
//   # Título          ## Subtítulo          ### Sección
//   - viñeta          - [ ] casilla / - [x] casilla hecha
//   > destacado       ---  separador
// Dentro de la línea:
//   **negrita**  *cursiva*  ~~tachado~~  ==resaltado==  `código`  {rojo:texto en color}
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
    .replace(/~~([^\n]+?)~~/g, '$1')
    .replace(/==([^\n]+?)==/g, '$1')
    .replace(new RegExp(`\\{(?:${COLORES.join('|')}):([^{}\\n]+)\\}`, 'g'), '$1')
}

// ---- Edición (devuelven el reemplazo a aplicar sobre el área de texto)

/** Un cambio sobre el texto: reemplazar [inicio, fin) por `texto` y dejar la selección en [selInicio, selFin). */
export interface Cambio {
  inicio: number
  fin: number
  texto: string
  selInicio: number
  selFin: number
}

/** Envuelve (o desenvuelve) la selección con una marca de línea: **, *, ~~, ==, `. */
export function alternarMarca(t: string, ini: number, fin: number, marca: string): Cambio {
  const sel = t.slice(ini, fin)
  const n = marca.length
  // Selección que ya incluye las marcas → se quitan.
  if (sel.length >= 2 * n && sel.startsWith(marca) && sel.endsWith(marca)) {
    const dentro = sel.slice(n, -n)
    return { inicio: ini, fin, texto: dentro, selInicio: ini, selFin: ini + dentro.length }
  }
  // Marcas justo afuera de la selección → se quitan.
  if (ini >= n && t.slice(ini - n, ini) === marca && t.slice(fin, fin + n) === marca) {
    return { inicio: ini - n, fin: fin + n, texto: sel, selInicio: ini - n, selFin: fin - n }
  }
  return { inicio: ini, fin, texto: `${marca}${sel}${marca}`, selInicio: ini + n, selFin: fin + n }
}

const RE_COLOR_COMPLETO = new RegExp(`^\\{(${COLORES.join('|')}):([\\s\\S]*)\\}$`)

/** Pinta la selección de un color. Con `null` (tinta) o el mismo color, quita el color. */
export function aplicarColor(t: string, ini: number, fin: number, color: Color | null): Cambio {
  let a = ini
  let b = fin
  let sel = t.slice(a, b)
  // Si la selección está justo dentro de {color:…}, se toma el envoltorio completo.
  const antes = t.slice(0, a).match(new RegExp(`\\{(${COLORES.join('|')}):$`))
  if (antes && t[b] === '}') {
    a -= antes[0].length
    b += 1
    sel = t.slice(a, b)
  }
  const m = sel.match(RE_COLOR_COMPLETO)
  const interior = m ? m[2] : sel
  if (!color || (m && m[1] === color)) {
    return { inicio: a, fin: b, texto: interior, selInicio: a, selFin: a + interior.length }
  }
  const abre = `{${color}:`
  return { inicio: a, fin: b, texto: `${abre}${interior}}`, selInicio: a + abre.length, selFin: a + abre.length + interior.length }
}

/** Líneas completas que toca la selección. */
function rangoLineas(t: string, ini: number, fin: number) {
  const a = t.lastIndexOf('\n', ini - 1) + 1
  let b = t.indexOf('\n', fin > ini && t[fin - 1] === '\n' ? fin - 1 : fin)
  if (b === -1) b = t.length
  return { a, b }
}

/** Pone o quita una marca de bloque (# , ## , ### , - , - [ ] , > ) en todas las líneas seleccionadas. */
export function alternarBloque(t: string, ini: number, fin: number, prefijo: string): Cambio {
  const { a, b } = rangoLineas(t, ini, fin)
  const lineas = t.slice(a, b).split('\n')
  const tipo = bloqueDe(prefijo + 'x').tipo
  const conTexto = lineas.filter((l) => l.trim())
  const todas = (conTexto.length ? conTexto : lineas).every((l) => bloqueDe(l).tipo === tipo)
  const nuevas = lineas.map((l) => {
    if (!l.trim() && lineas.length > 1) return l
    const limpia = l.replace(PREFIJO_BLOQUE, '')
    return todas ? limpia : prefijo + limpia
  })
  const texto = nuevas.join('\n')
  // Con una sola línea, el cursor queda al final de la línea; con varias, se seleccionan todas.
  return lineas.length === 1
    ? { inicio: a, fin: b, texto, selInicio: a + texto.length, selFin: a + texto.length }
    : { inicio: a, fin: b, texto, selInicio: a, selFin: a + texto.length }
}

/** Inserta un separador en su propia línea. */
export function insertarSeparador(t: string, pos: number): Cambio {
  const antes = t.slice(0, pos)
  const pre = antes === '' || antes.endsWith('\n') ? '' : '\n'
  const post = t.slice(pos).startsWith('\n') ? '' : '\n'
  const texto = `${pre}---${post}`
  return { inicio: pos, fin: pos, texto, selInicio: pos + texto.length, selFin: pos + texto.length }
}

/**
 * Enter dentro de una lista o casilla: sigue la lista en la línea nueva.
 * Si el ítem estaba vacío, termina la lista (quita la marca). null = Enter normal.
 */
export function enterEnLista(t: string, pos: number): Cambio | null {
  const a = t.lastIndexOf('\n', pos - 1) + 1
  const linea = t.slice(a, pos)
  const m = linea.match(/^(- \[[ xX]\] |- )/)
  if (!m) return null
  if (linea === m[0]) return { inicio: a, fin: pos, texto: '', selInicio: a, selFin: a }
  const sigue = m[0].startsWith('- [') ? '- [ ] ' : '- '
  return { inicio: pos, fin: pos, texto: `\n${sigue}`, selInicio: pos + 1 + sigue.length, selFin: pos + 1 + sigue.length }
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
