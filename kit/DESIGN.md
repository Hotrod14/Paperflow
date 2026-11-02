# Design · papeles sobre la mesa

> Sistema visual de Paperflow. Si en el descubrimiento la persona elige otra estética, se mantienen la **estructura**, la **accesibilidad** y los **sonidos como capa opcional**, y solo cambian los tokens.

## 1. Concepto

- La pantalla es una **mesa**. Cada bloque de información es un **papel** apoyado encima: hoja, ficha, ticket o cinta, con sombra corta, borde rasgado, una fibra sutil y una leve rotación.
- Lo escrito "a mano" (títulos, botones, sellos) usa letra manuscrita; lo que se lee, una serif cómoda; los datos (fechas, conteos, ids), máquina de escribir.
- Calma y foco: pocos colores, mucho aire, nada que parpadee.
- **El color nunca va solo**: cada estado lleva su palabra (crítico, secundario, de ayer, 💤 sin cierres).

## 2. Tipografía

| Rol | Familia | Uso |
|---|---|---|
| `--manuscrita` | **Caveat** 500/700 | Marca (40 px), títulos de sección (32 px), botones (20–21 px), sellos y etiquetas |
| `--lectura` | **Newsreader** 400/500/600 (opsz 6–72) | Texto de tareas y notas (18 px, interlineado 32 px en el cuaderno) |
| `--datos` | **Courier Prime** 400/700 | Fechas, conteos, "notion leído hace…", kicker (12 px, mayúsculas, +0.06em) |

Se cargan desde Google Fonts con `display=swap` y `preconnect`.

## 3. Color (tokens en `:root`)

| Token | Claro | Oscuro | Significado |
|---|---|---|---|
| `--mesa` | `#c7d0bc` | `#1b1e19` | Fondo (salvia) |
| `--papel` | `#f6f1e5` | `#2a2923` | Hojas |
| `--cinta` | `#f2e4b9` | `#3a3424` | Cinta adhesiva, papel destacado |
| `--ticket` | `#dce5d0` | `#263024` | Tickets o recibos |
| `--linea` · `--linea-2` | `#e5dcc8` · `#c9bfa8` | `#36342c` · `#5a564a` | Renglones y bordes |
| `--tinta` · `--tinta-2` | `#25241f` · `#57544a` | `#eee8da` · `#c1baa8` | Texto principal y secundario |
| `--critico` | `#a0432a` | `#e8957a` | Crítico o urgente (siempre con la palabra) |
| `--secundario` | `#7b5a12` | `#e6bd62` | Secundario |
| `--azul` | `#2c4877` | `#a9c1eb` | Acción (botones, enlaces, foco) |
| `--quieto` · `--en-hoy` | `#ece3cf` · `#e9ddbe` | `#3a372e` · `#45402f` | Sin movimiento · elegido para hoy |
| `--sombra` | `rgba(58,52,36,.2)` | `rgba(0,0,0,.5)` | Sombras |

**Tema**: sigue a `prefers-color-scheme` hasta que la persona elija. La elección se guarda en `localStorage` (`<app>:tema`) y se aplica con `data-tema` en `<html>`. Un **script inline en `index.html`** la aplica antes de pintar, para que no haya parpadeo.

**Fondos de mesa** (`data-fondo`, en Ajustes): salvia (por defecto), café crema `#dcc9ad`, madera `#cda983` (vetas con gradientes), pizarra `#bfc8d0` y nogal (foto de madera oscura). Solo cambian `--mesa`, `--ticket` y la decoración. Si el fondo es oscuro en tema claro, el texto que va directo sobre la mesa pasa a tinta clara y **todo lo que es papel recupera la tinta oscura**: hay que incluir cada componente de papel en esa regla.

Contraste mínimo **AA** (4,5:1 en texto, 3:1 en bordes de controles) en todas las combinaciones de tema y fondo.

## 4. Formas y texturas

- `--a-mano: 255px 15px 225px 15px / 15px 225px 15px 255px`: borde redondeado "dibujado a mano" para botones y sellos.
- **Borde rasgado**: `clip-path: polygon(...)` con dos variantes (`.borde-a`, `.borde-b`) para que los papeles vecinos no se vean iguales.
- **Fibra**: dos `radial-gradient` de 1 px muy tenues (`--fibra`, `--fibra-2`) en 6 y 9 px.
- **Rayado**: `repeating-linear-gradient` de 32 px (`.papel--rayado`).
- **Rotación**: entre −0,6° y +0,6° por papel (`girar`). Nunca en texto largo editable.
- **Decoración**: una ramita en SVG fija en la esquina (`aria-hidden`), oculta en celular.

## 5. Componentes

| Componente | Descripción |
|---|---|
| **Papel** | `<Papel variante="hoja·cinta·ticket·rayado" borde="a·b·cinta" girar={n} as="section">`. Sombra con `filter: drop-shadow` en el contenedor y clip-path en el interior. |
| **Navegación** | Hoja rayada a la izquierda con la marca, los enlaces (hoy · semana · cuaderno), "proyectos · abiertos" con conteo, "notion leído hace…" y "releer". En celular pasa a una barra superior. |
| **Tarjeta de contenedor** | Kicker (proyecto), título, **sello** de estado rotado −4° (curso = crítico, ejecutado = secundario, neutro = discontinuo) y lista de tareas. |
| **Fila de tarea** | Casilla dibujada (44×44 de área táctil) · título · etiquetas (`tag-critico` con borde, `tag-secundario` con subrayado ondulado, `tag-quieto` en mono, `tag-ayer` en azul) · acciones "+ hoy" y "detalle". |
| **Hoja de detalle** | Panel con los campos, nota, "copiar para Claude Code", "abrir en Notion" y "abrir <contenedor>". |
| **Botones** | `btn-mano`: contorno azul con borde a mano y 44 px de alto. `btn-texto`: subrayado; variante `--suave` con onda y `--rojo` para lo peligroso. |
| **Aviso (toast)** | Banda oscura abajo con el texto, **deshacer** y cerrar; variante de error. |
| **Banda** | Aviso dentro de la página (Notion no responde, copia local). |
| **Menú de perfil** | Avatar con la inicial → popover en *portal* (para que no lo recorte el papel rotado): Perfil · Tema (claro/oscuro) · Ajustes (fondos con muestra). |
| **Semana** | Columna de tarjetas por contenedor (✅ cerradas · 📌 quedan · 💤 sin cierres), lista lateral para elegir qué va al guion y **Guion oral** al final, con jerarquía numerada. |
| **Cuaderno** | Índice en ficha (buscador, chips de proyecto, lista con 📌 fijadas) bajo el menú en escritorio. Hoja abierta con **espiral** de 16 anillos metálicos, **margen rojo** y **renglones azules** de 32 px. Menú `···` (editar, fijar, arrancar hoja con confirmación). Editor con título, chips de proyecto y área que crece con el texto. |
| **Foto pegada** | Marco claro de 8 px, inclinado ±0,8° y con una **cinta** translúcida arriba. Su alto se redondea a renglones completos para que el texto siguiente caiga sobre las líneas. Clic → **visor** a pantalla completa (Esc o clic fuera para cerrar). |

## 6. Movimiento

- Transiciones cortas (120–200 ms) solo en hover, aparición del visor y avisos.
- Todo movimiento se apaga con `prefers-reduced-motion: reduce`.
- Nada se mueve solo, salvo el indicador "pegando…".

## 7. Sonidos (capa opcional)

Archivos cortos en `public/sonidos/`, en **ogg con mp3 de respaldo**, precargados al iniciar sesión y con volumen entre 0,45 y 1:

| Sonido | Cuándo |
|---|---|
| `pasar-hoja` | Navegar, cambiar de ámbito, abrir una nota, abrir el visor, deshacer |
| `lapiz` | Marcar una casilla, "releer", guardar o editar una nota, fijar |
| `abrir-tarea` | Abrir "+ tarea suelta" o una nota nueva |
| `arrancar-hoja` | Eliminar una nota o quitar una imagen |
| `cinta` | Pegar una imagen |

- Si el navegador bloquea el audio, se ignora en silencio. La interfaz nunca depende del sonido.
- Pueden ser grabaciones reales o sintetizados (ruido filtrado en ráfagas, como el original).
- Respetar una preferencia "sin sonidos" si la persona la pide en el descubrimiento.

## 8. Accesibilidad

- Foco visible: `outline: 2px solid var(--azul)` con 2 px de separación.
- Áreas táctiles de 44×44 px como mínimo.
- Landmarks (`nav`, `main`, `section` con `aria-labelledby`), menús con `role="menu"`, el visor con `role="dialog" aria-modal`.
- Avisos con `aria-live="polite"`.
- Teclado: `Ctrl/Cmd+S` guarda una nota, `Esc` cancela o cierra, y doble clic sobre la hoja la edita.
- Textos alternativos en las imágenes. Lo decorativo, con `aria-hidden`.

## 9. Responsive

- Punto de quiebre: **720 px**.
- Escritorio: navegación a la izquierda (220 px como mínimo) y contenido flexible, con un máximo de 1.440 px.
- Celular: barra superior con la marca, los enlaces y el avatar. En Semana, la lista pasa a ir antes del guion. En el cuaderno se alterna entre **índice** y **hoja** con "← índice".
- Sin scroll horizontal y con un margen lateral de 14–16 px.

## 10. Revisión visual (antes de entregar cada fase)

Capturas de cada vista en: claro y oscuro · cada fondo · escritorio (1.360 px) y celular (390 px). Revisar el contraste, que los papeles rotados no recorten menús, que los renglones se alineen y que no haya texto ilegible sobre la mesa.
