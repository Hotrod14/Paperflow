import { describe, expect, it } from 'vitest'
import { aDoc, aTexto } from './editorDoc.ts'

const ida_y_vuelta = (t: string) => aTexto(aDoc(t))

describe('editor ⇄ texto de la nota', () => {
  it('conserva la jerarquía y los bloques', () => {
    const t = [
      '# Plan',
      '## Kefuri',
      '### Críticos',
      '- [x] Revisar RUT',
      '- [ ] Migrar fechas',
      '- punto uno',
      '- punto dos',
      '> ojo con producción',
      '---',
      '',
      'texto normal',
    ].join('\n')
    expect(ida_y_vuelta(t)).toBe(t)
  })

  it('conserva el formato dentro de la línea y escribe la cursiva con guion bajo', () => {
    expect(ida_y_vuelta('a **b** _c_ ~~d~~ ==e== `f_g` {rojo:h}')).toBe('a **b** _c_ ~~d~~ ==e== `f_g` {rojo:h}')
    expect(ida_y_vuelta('*vieja cursiva*')).toBe('_vieja cursiva_')
    expect(ida_y_vuelta('{azul:**Se actualiza: 6.2**}')).toBe('{azul:**Se actualiza: 6.2**}')
  })

  it('negrita y cursiva vecinas no se confunden', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'a', marks: [{ type: 'bold' }] },
            { type: 'text', text: 'b', marks: [{ type: 'italic' }] },
            { type: 'text', text: 'c', marks: [{ type: 'bold' }, { type: 'italic' }] },
          ],
        },
      ],
    }
    const t = aTexto(doc)
    expect(t).toBe('**a**_b_**_c_**')
    expect(aDoc(t)).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'a', marks: [{ type: 'bold' }] },
            { type: 'text', text: 'b', marks: [{ type: 'italic' }] },
            { type: 'text', text: 'c', marks: [{ type: 'bold' }, { type: 'italic' }] },
          ],
        },
      ],
    })
  })

  it('conserva las imágenes en su lugar', () => {
    const B = '11112222-3333-4444-5555-666677778888'
    const t = `antes\n![imagen](bloque:${B})\ndespués`
    expect(ida_y_vuelta(t)).toBe(t)
  })

  it('una hoja vacía queda vacía', () => {
    expect(ida_y_vuelta('')).toBe('')
  })
})
