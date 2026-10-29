import { describe, expect, it } from 'vitest'
import {
  archivosABloques,
  idsImagen,
  insertarImagen,
  marcaImagen,
  partesContenido,
  quitarImagen,
  sinImagenes,
} from '../../supabase/functions/_shared/imagenes.ts'

const A = '0123456789abcdef0123456789abcdef'
const B = '11112222-3333-4444-5555-666677778888'

describe('imágenes del cuaderno', () => {
  it('separa texto e imágenes y quita el salto que rodea a cada imagen', () => {
    const t = `antes\n${marcaImagen('bloque', B)}\ndespués`
    expect(partesContenido(t)).toEqual([
      { tipo: 'texto', texto: 'antes' },
      { tipo: 'imagen', origen: 'bloque', id: B, alt: 'imagen' },
      { tipo: 'texto', texto: 'después' },
    ])
  })

  it('lee ids por origen y los pasa de archivo a bloque', () => {
    const t = `${marcaImagen('archivo', A)}\nx\n${marcaImagen('bloque', B)}`
    expect(idsImagen(t, 'archivo')).toEqual([A])
    expect(idsImagen(t, 'bloque')).toEqual([B])
    expect(idsImagen(archivosABloques(t, { [A]: 'aaaabbbb-cccc-dddd-eeee-ffff00001111' }), 'bloque')).toHaveLength(2)
  })

  it('inserta en su propia línea y quita sin dejar líneas sueltas', () => {
    const { texto } = insertarImagen('hola mundo', 4, marcaImagen('archivo', A))
    expect(texto).toBe(`hola\n${marcaImagen('archivo', A)}\n mundo`)
    expect(quitarImagen(texto, A)).toBe('hola\n mundo')
  })

  it('el texto sin marcas sirve para buscar y resumir', () => {
    expect(sinImagenes(`${marcaImagen('bloque', B)}\nnota`)).toBe('\nnota')
  })
})
