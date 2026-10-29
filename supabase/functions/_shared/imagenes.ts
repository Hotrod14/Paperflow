// Imágenes del cuaderno: cómo se marcan dentro del texto de una nota.
//
// La imagen vive como bloque en el cuerpo de la página de Notion. En la propiedad "Contenido"
// queda una marca en su lugar del texto, para saber dónde dibujarla:
//   ![imagen](bloque:<id del bloque>)    imagen ya pegada en la página
//   ![imagen](archivo:<id de subida>)    recién subida; la función la pega al guardar
// Se comparte entre la app y la función (lógica pura, sin dependencias).

export const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const
/** Límite de Notion por archivo en el plan gratuito. */
export const MAX_BYTES_IMAGEN = 5 * 1024 * 1024

export type OrigenImagen = 'bloque' | 'archivo'
export type ParteNota = { tipo: 'texto'; texto: string } | { tipo: 'imagen'; origen: OrigenImagen; id: string; alt: string }

const patron = () => /!\[([^\]\n]{0,80})\]\((bloque|archivo):([0-9a-fA-F-]{32,36})\)/g

export const marcaImagen = (origen: OrigenImagen, id: string, alt = 'imagen') => `![${alt}](${origen}:${id})`

/** Separa el contenido en trozos de texto e imágenes, en orden. Quita el salto de línea que rodea a cada imagen. */
export function partesContenido(contenido: string): ParteNota[] {
  const partes: ParteNota[] = []
  let desde = 0
  for (const m of contenido.matchAll(patron())) {
    partes.push({ tipo: 'texto', texto: contenido.slice(desde, m.index) })
    partes.push({ tipo: 'imagen', alt: m[1], origen: m[2] as OrigenImagen, id: m[3] })
    desde = m.index! + m[0].length
  }
  partes.push({ tipo: 'texto', texto: contenido.slice(desde) })
  return partes
    .map((p, i) => {
      if (p.tipo !== 'texto') return p
      let t = p.texto
      if (partes[i - 1]?.tipo === 'imagen') t = t.replace(/^\n/, '')
      if (partes[i + 1]?.tipo === 'imagen') t = t.replace(/\n$/, '')
      return { tipo: 'texto' as const, texto: t }
    })
    .filter((p) => p.tipo === 'imagen' || p.texto !== '')
}

/** Reemplaza cada marca de imagen por lo que devuelva f. */
export function mapearMarcas(contenido: string, f: (marca: string, origen: OrigenImagen, id: string) => string): string {
  return contenido.replace(patron(), (todo, _alt, origen, id) => f(todo, origen as OrigenImagen, id))
}

/** Ids de las imágenes de un origen, en el orden en que aparecen. */
export function idsImagen(contenido: string, origen: OrigenImagen): string[] {
  return [...contenido.matchAll(patron())].filter((m) => m[2] === origen).map((m) => m[3])
}

/** Cambia las marcas archivo:<subida> por bloque:<bloque> según el mapa. */
export function archivosABloques(contenido: string, mapa: Record<string, string>): string {
  return contenido.replace(patron(), (todo, alt, origen, id) => (origen === 'archivo' && mapa[id] ? marcaImagen('bloque', mapa[id], alt) : todo))
}

/** El texto sin las marcas de imagen (para buscar y para el resumen del índice). */
export function sinImagenes(contenido: string): string {
  return contenido.replace(patron(), '').replace(/\n{3,}/g, '\n\n')
}

/** Quita una imagen (y el salto de línea que la acompaña). */
export function quitarImagen(contenido: string, id: string): string {
  return contenido.replace(patron(), (todo, _alt, _origen, x) => (x === id ? '\u0000' : todo)).replace(/\n?\u0000\n?/g, '\n').replace(/^\n/, '')
}

/** Inserta la marca en la posición dada, en su propia línea. Devuelve el texto y la posición tras la marca. */
export function insertarImagen(contenido: string, pos: number, marca: string): { texto: string; pos: number } {
  const p = Math.max(0, Math.min(pos, contenido.length))
  const antes = contenido.slice(0, p)
  const despues = contenido.slice(p)
  const pre = antes === '' || antes.endsWith('\n') ? '' : '\n'
  const post = despues.startsWith('\n') ? '' : '\n'
  const texto = `${antes}${pre}${marca}${post}${despues}`
  return { texto, pos: antes.length + pre.length + marca.length + post.length }
}
