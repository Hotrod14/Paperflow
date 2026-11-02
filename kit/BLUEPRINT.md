# Blueprint · arquitectura

> Cómo está construido Paperflow y cómo se adapta al modelo de otra persona. Si el código original está disponible, este documento describe lo que ya existe; si no, es la especificación para rehacerlo.

## 1. Vista general

```
Navegador (React SPA en Vercel)
   │  login con enlace mágico (Supabase Auth)
   │  POST { accion, ... } + JWT de la sesión
   ▼
Supabase Edge Function  (Deno)       ← única puerta a Notion
   │  valida sesión + correo autorizado
   │  valida campos (lista blanca) y que la página sea de nuestras bases
   │  token de Notion (secreto, solo aquí)
   ▼
Notion API 2025-09-03 (data sources)  ← fuente única de verdad
```

- **Sin base de datos propia.** Supabase se usa solo para Auth y para alojar la función.
- **Un solo usuario.** El registro está cerrado; solo entra `ALLOWED_EMAIL`.

## 2. Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 · TypeScript 6 · Vite 8 · CSS propio (sin framework) |
| Pruebas | Vitest (lógica pura) · Playwright (capturas de revisión, opcional) |
| Auth | Supabase Auth · enlace mágico · `enable_signup = false` |
| Backend | Supabase Edge Function en Deno · `supabase-js@2` vía `jsr:` |
| Datos | Notion API `2025-09-03` con integración interna |
| Hosting | Vercel (SPA con rewrite a `index.html`, despliegue en cada push) |
| Tipografías | Google Fonts: Caveat · Newsreader · Courier Prime |

## 3. Estructura de carpetas

```
.
├─ index.html                 # fuentes + script inline de tema/fondo (evita el parpadeo)
├─ vercel.json                # rewrite SPA
├─ .env.example               # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├─ MODELO.md                  # salida del descubrimiento (fuente del modelo)
├─ CLAUDE.md                  # reglas de trabajo en este repo
├─ public/
│  ├─ sonidos/*.ogg|mp3       # pasar-hoja, lapiz, abrir-tarea, arrancar-hoja, cinta
│  └─ fondos/*.jpg            # fondo de foto (opcional)
├─ src/
│  ├─ main.tsx · App.tsx      # rutas por hash (#hoy, #semana, #cuaderno), lectura, avisos
│  ├─ components/             # Papel, Tarjeta, Hoy, Semana, HojaDetalle, NuevaTarea,
│  │                          # Cuaderno, MenuUsuario, SelectorTema, Login
│  ├─ lib/
│  │  ├─ api.ts               # llamar(accion) + copia local (localStorage)
│  │  ├─ vista.ts             # lógica PURA de Hoy y Semana (+ tests)
│  │  ├─ cuaderno.ts          # lógica pura del cuaderno (+ tests)
│  │  ├─ imagen.ts            # comprimir imágenes en el navegador
│  │  ├─ fechas.ts · tema.ts · sonido.ts · tipos.ts
│  └─ styles/app.css          # tokens + componentes (ver DESIGN.md)
└─ supabase/
   ├─ config.toml             # verify_jwt = false (la función valida sola)
   └─ functions/
      ├─ _shared/             # compartido con el frontend cuando es lógica pura
      │  ├─ modelo.ts         # ★ ids de bases, nombres de propiedades y roles de estado
      │  ├─ mapeo.ts          # Notion ⇄ tipos de la app + listas blancas de escritura
      │  ├─ notion.ts         # cliente mínimo de Notion (reintento 429, validación de padre)
      │  ├─ imagenes.ts       # marcas de imagen en el texto (pura)
      │  ├─ auth.ts · cors.ts · respuesta.ts
      └─ <nombre>/index.ts    # la función: despacha por `accion`
```

## 4. Contrato de la API

Un solo endpoint: `POST /functions/v1/<nombre>` con `Authorization: Bearer <jwt>` y cuerpo JSON `{ accion, ... }`.

| Acción | Cuerpo | Respuesta |
|---|---|---|
| `leer` | `{ fresco?: boolean }` | `{ leidoEn, contenedores, tareas, sueltas }`: tareas abiertas y cerradas en los últimos 35 días |
| `actualizarTarea` | `{ id, cambios }` | tarea actualizada. Sirve para tareas y tareas sueltas |
| `actualizarContenedor` | `{ id, cambios }` | contenedor actualizado (solo Estado) |
| `crearTarea` | `{ nueva: { titulo, proyecto, ambito?, nota?, enFoco? } }` | tarea suelta creada |
| `leerNotas` | `{}` | `{ notas }` |
| `crearNota` | `{ nota: { titulo?, contenido?, proyecto?, fijada? } }` | nota |
| `actualizarNota` | `{ id, cambios }` | nota |
| `eliminarNota` · `restaurarNota` | `{ id }` | `{ ok }` (papelera de Notion) |
| `subirImagen` | `{ nombre, tipo, datos(base64) }` | `{ archivo }` (id de subida) |
| `leerImagenes` | `{ id }` (nota) | `{ imagenes: [{ id, url }] }`, con URL que vence en 1 h |

> En el original, las acciones se llaman `actualizarPendiente` y `actualizarAuditoria`. Al adaptar, conviene usar nombres genéricos y dejar el vocabulario solo en la interfaz.

**Campos escribibles (lista blanca)**:
- tarea o tarea suelta: Estado, Fecha de cierre, Cerrado por, Evidencia, En foco (más los extras que defina `MODELO.md`)
- contenedor: Estado
- nota: Título (≤ 200 caracteres), Contenido (≤ 20.000, en trozos de 2.000), Proyecto, Fijada

Cualquier otro campo → `400`. Un id con formato inválido → `400`. Una página que no pertenece a nuestras bases → `403`.

## 5. Capa de adaptación: `modelo.ts`

Es el **único lugar** con nombres de Notion. Lo comparten la función y el frontend. Se genera desde `MODELO.md`:

```ts
export const MODELO = {
  nombre: 'Paperflow',
  vocabulario: {
    contenedor: { uno: 'iniciativa', varios: 'iniciativas' },
    tarea: { uno: 'tarea', varios: 'tareas' },
  },
  bases: {
    contenedores: { dataSource: '…', database: '…' },
    tareas: { dataSource: '…', database: '…' },
    sueltas: { dataSource: '…', database: '…' },   // null si no aplica
    notas: { dataSource: '…', database: '…' },     // null si no aplica
  },
  prop: {
    tarea: { titulo: 'Tarea', contenedor: 'Iniciativa', estado: 'Estado', importancia: 'Tipo',
             categoria: 'Categoría', foco: 'Para hoy', cierre: 'Fecha de cierre',
             cerradoPor: 'Cerrado por', evidencia: 'Evidencia', nota: 'Nota' },
    contenedor: { nombre: 'Nombre', proyecto: 'Proyecto', ambito: 'Ámbito', estado: 'Estado', meta: 'Meta', pagina: 'Página' },
  },
  roles: {
    tarea: { abiertas: ['Abierta', 'En curso'], hecha: 'Hecha', descartada: 'Descartada' },
    contenedor: { activos: ['Por empezar', 'En curso'], terminado: 'Terminado', detenido: 'Detenido' },
    importancia: ['Crítica', 'Secundaria'],   // orden en Hoy
  },
  ambitos: ['Trabajo', 'Personal'],           // [] = sin selector
  funciones: { sueltas: true, cuaderno: true, semana: 'guion', revisionNocturna: false },
} as const
```

- Los ids pueden sobrescribirse con variables de entorno de la función (`NOTION_DS_*`, `NOTION_DB_*`).
- `vista.ts` usa **roles**, no textos: `esHecha(t) = t.estado === MODELO.roles.tarea.hecha`.
- Los textos de la interfaz salen de `vocabulario`.

## 6. Seguridad

1. **Token de Notion** solo en los secretos de la función (`NOTION_TOKEN`). Nunca en el repo, el navegador, Notion ni el chat.
2. **Sesión**: la función llama `auth.getUser(jwt)` y exige `email === ALLOWED_EMAIL`. Se usa `verify_jwt = false` porque los proyectos nuevos de Supabase firman con claves asimétricas; la validación real la hace la función. La clave pública se lee de `SUPABASE_ANON_KEY` o de `SUPABASE_PUBLISHABLE_KEYS`.
3. **CORS** limitado a `ALLOWED_ORIGINS` (la URL de Vercel y `http://localhost:5173`). Es una defensa extra: la real es la sesión.
4. **Escritura acotada**: lista blanca de campos y, antes de cada escritura, `paginaDe(id, bases)` confirma que el padre de la página sea una de nuestras bases.
5. **Registro cerrado** en Supabase: el único usuario se crea a mano.
6. **Imágenes**: solo PNG, JPG, GIF o WebP, de 5 MB como máximo. El nombre se limpia.
7. **Datos**: nada sensible real.

## 7. Flujos clave

### Lectura
- Al abrir: se pinta la **copia local** (localStorage) y se pide `leer` en segundo plano.
- Se relee cada 3 minutos, al volver a la pestaña y con el botón "releer" (`fresco: true` salta la caché de 45 s de la función).
- Si falla: se mantiene la copia y aparece una banda "No pude leer Notion… muestro la última copia de hace X".

### Escritura optimista
- Se cambia la interfaz al tiro y se manda la escritura. Si falla, se revierte y aparece un aviso de error.
- Las acciones destructivas o de cierre muestran un aviso con **deshacer**.

### Hoy y Semana (lógica pura en `vista.ts`, con tests)
- `integrarSueltas`: convierte las tareas sueltas en contenedores virtuales "Tareas sueltas · <proyecto>", para que Semana las trate igual.
- `construirHoy(datos, ambito, hoy)`: Para hoy (foco = hoy, o anterior y abierta → "de ayer"), Sueltas y Por contenedor.
- `construirSemana(datos, ambito, hoy)`: cerradas en los últimos 7 días por contenedor, lo que queda abierto y los detenidos.
- `guionEstructura` / `guionOral`: bloques numerados (✅ cerradas, 💤 sin cierres, 📌 lo que queda).

### Imágenes del cuaderno
1. El navegador achica a 1.800 px por lado y pasa a WebP (los GIF van intactos), con un máximo de 5 MB.
2. `subirImagen` → API de subida de archivos de Notion (`POST /file_uploads` + `/send`) → devuelve el id de subida.
3. En el texto queda la marca `![imagen](archivo:<id>)`; en el editor se ve como `[📷 imagen N]`.
4. Al guardar, la función pega las subidas como bloques `image` en la página (`PATCH /blocks/{page}/children`) y cambia las marcas a `![imagen](bloque:<id>)`.
5. Para mostrar: `leerImagenes` lista los bloques y entrega URL firmadas que **vencen en 1 h**. La app las renueva cada 40 minutos, al volver a la pestaña o si una imagen falla, y abre un visor propio (nunca el enlace directo).
6. Si se quita una marca y se guarda, ese bloque va a la papelera. Las imágenes agregadas directo en Notion se muestran al final y no se tocan.

### Notion
- `consultarTodo(dataSource, filtro)` pagina de a 100.
- Ante un `429`, reintenta respetando `Retry-After`, como máximo 2 veces.
- rich_text en trozos de 2.000 caracteres (25 trozos como máximo por propiedad).

## 8. Variables y secretos

| Dónde | Nombre | Valor |
|---|---|---|
| Vercel y `.env.local` | `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
| Vercel y `.env.local` | `VITE_SUPABASE_ANON_KEY` | clave *anon* o *publishable* (pública) |
| Secretos de la función | `NOTION_TOKEN` | token de la integración (**secreto**) |
| Secretos de la función | `ALLOWED_EMAIL` | correo de la persona |
| Secretos de la función | `ALLOWED_ORIGINS` | `https://<app>.vercel.app,http://localhost:5173` |
| Secretos de la función (opcional) | `NOTION_DS_*` / `NOTION_DB_*` | sobrescriben los ids de `modelo.ts` |

## 9. Pruebas

- **Unitarias (Vitest)**: toda la lógica pura (`vista.ts`, `cuaderno.ts`, `imagenes.ts`, `mapeo.ts`). Casos mínimos: "de ayer", semana sin cierres (💤), sueltas integradas, roles de estado personalizados, marcas de imagen.
- **Tipos**: `tsc -b` en el frontend y `deno check` en la función.
- **Revisión visual**: build de demo con la API simulada (Playwright intercepta `https://demo.supabase.co/**`). Capturas en claro, oscuro y celular de cada vista antes de entregar.
