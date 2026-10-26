# Paperflow

Una vista tranquila de mis pendientes y auditorías, sin navegar Notion.

- **Hoy** · eliges hasta 3 pendientes para el día y ves todo lo abierto en tarjetas por auditoría.
- **Semana** · arma el reporte del jueves (lo cerrado, lo abierto, lo detenido) y avisa si falta alguna auditoría.

Notion sigue siendo la única fuente de verdad. Paperflow lee y escribe las mismas filas que usa Claude Code, así que no hay sincronización.

> ⚠️ Solo datos de prueba. No cargar información real de pacientes.

## Cómo funciona

```
Navegador (React, Vercel)
   │  sesión de Supabase Auth (enlace mágico, un solo correo)
   ▼
Supabase Edge Function `paperflow`
   │  token de Notion (solo vive aquí)
   ▼
Notion · bases "Auditorías", "Pendientes", "Tareas sueltas" y "Cuaderno de notas"
```

- Acciones de la función:
  - tareas: `leer`, `actualizarPendiente`, `actualizarAuditoria` y `crearTarea`
  - cuaderno: `leerNotas`, `crearNota`, `actualizarNota`, `eliminarNota` y `restaurarNota`
- `crearTarea` solo crea filas en la base **"Tareas sueltas"** (separada de Auditorías y Pendientes).
- Solo se pueden escribir estos campos:
  - pendiente o tarea suelta: Estado, Fecha de cierre, Cerrado por, Evidencia, En foco (y Avisado a diseño en pendientes)
  - auditoría: Estado
  - nota: Título, Contenido (hasta 20.000 caracteres), Proyecto, Fijada
- Antes de escribir, verifica que la página pertenezca a las bases de Paperflow.
- Si Notion no responde, la app muestra la última copia guardada en el navegador.

## Puesta en marcha

### 1. Notion

1. Crea una integración interna en <https://www.notion.so/profile/integrations>.
   - Capacidades: leer, actualizar e **insertar** contenido (insertar se usa solo para crear tareas sueltas y notas).
2. Copia el token (`ntn_…`) a tu gestor de contraseñas. Nunca lo pegues en una página de Notion.
3. En la página **Paperflow — Auditorías y pendientes** (en *Journal*), abre `···` → *Conexiones* y agrega la integración.
   - Esa página contiene todas las bases; así quedan compartidas todas.

### 2. Supabase

1. Crea un proyecto nuevo.
2. *Authentication → Providers → Email*: deja activo el enlace mágico.
3. *Authentication → Sign In / Providers*: desactiva **Allow new users to sign up**.
4. *Authentication → Users → Add user*: crea tu usuario con tu correo.
5. *Edge Functions → Secrets*: agrega los secretos desde el panel (así el token no queda en el historial de la terminal):
   - `NOTION_TOKEN` = el token de Notion
   - `ALLOWED_EMAIL` = tu correo
   - `ALLOWED_ORIGINS` = `http://localhost:5173` (se suma la URL de Vercel en el paso 3)
6. Despliega la función desde tu computador:

```bash
git clone https://github.com/Hotrod14/Paperflow.git && cd Paperflow
npx supabase login
npx supabase link --project-ref <ref>
npx supabase functions deploy paperflow
```

La función valida la sesión ella misma (`verify_jwt = false` en `config.toml`), así que funciona con las claves nuevas y las antiguas de Supabase.

Variables opcionales, ya tienen valor por defecto:

| Variable | Para qué |
|---|---|
| `NOTION_VERSION` | Versión de la API (`2025-09-03`) |
| `NOTION_DS_AUDITORIAS` / `NOTION_DS_PENDIENTES` | IDs de data source |
| `NOTION_DB_AUDITORIAS` / `NOTION_DB_PENDIENTES` | IDs de base de datos |
| `NOTION_DS_SUELTAS` / `NOTION_DB_SUELTAS` | Base "Tareas sueltas" |
| `NOTION_DS_NOTAS` / `NOTION_DB_NOTAS` | Base "Cuaderno de notas" |

### 3. Vercel

1. Importa el repo. Vercel detecta Vite solo.
2. Agrega estas variables de entorno:
   - `VITE_SUPABASE_URL` = `https://<ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = la clave *anon / publishable*
3. Despliega.
4. En Supabase, ve a *Authentication → URL Configuration*:
   - *Site URL* = la URL de Vercel.
   - Agrégala también en *Redirect URLs*.

### Local

```bash
cp .env.example .env.local   # completa las dos variables
npm install
npm run dev                  # http://localhost:5173
npm test                     # lógica de vistas y mapeo
```

## Cómo cierra pendientes Claude Code

Claude Code usa el MCP oficial de Notion y escribe en la misma fila:

- **Estado** = Hecho
- **Fecha de cierre** = hoy
- **Evidencia** = hash del commit
- **Cerrado por** = Claude Code

El botón **copiar para Claude Code** en el detalle de cada pendiente arma esa instrucción. Paperflow lo muestra en la siguiente lectura (cada 3 minutos, al volver a la pestaña o con *releer*).

## Tareas sueltas

Para lo espontáneo ("me pidieron revisar los links de Ruta Digital"):

1. En **Hoy**, botón **+ tarea suelta**: escribe la tarea, elige el proyecto y, si quieres, márcala para "para hoy".
2. Queda en la base **"Tareas sueltas"** de Notion (Tarea, Proyecto, Ámbito, Estado, En foco, Nota…) y aparece en su propio apartado de Hoy.
3. Se cierra igual que cualquier pendiente: marcando la casilla. En Semana aparece como "Tareas sueltas · proyecto".

Los proyectos disponibles son las opciones de la propiedad Proyecto (Kefuri, Ruta Digital, Paperflow, Tecnopolis, Cap Ideas, Otro). Para sumar uno, agrégalo en Notion y en `PROYECTOS` de `mapeo.ts`.

## Reglas de la vista

- Los **críticos** van primero, después: Hacer ya, QA y Deuda.
- **Espera decisión** se separa en "esperando a otros".
- **Quieto** significa sin movimiento por más de 14 días.
- Si los datos lo indican, la tarjeta sugiere *Crítico ejecutado* o *Todo ejecutado*. Tú decides si marcarlo.
- Un pendiente sin auditoría de origen aparece en la tarjeta "revisar origen". Nunca se pierde.

## Cuaderno de notas

Pestaña **cuaderno** (`#cuaderno`): notas para organizarse, guardadas en la base **"Cuaderno de notas"** de Notion (Título, Contenido, Proyecto, Fijada).

- **+ nueva nota** abre una hoja en blanco. `Ctrl/Cmd + S` guarda y `Esc` cancela.
- El menú `···` de cada hoja permite editar, fijar arriba y arrancar la hoja (eliminar).
- Doble clic sobre la hoja también la abre para editar.
- Eliminar manda la página a la papelera de Notion. El aviso trae **deshacer**, y la nota también se puede recuperar desde la papelera.
- El índice busca sin distinguir tildes y filtra por proyecto. Las notas fijadas van primero.
- Sonidos: abrir hoja, pasar hoja, trazo de lápiz al guardar y hoja arrancada al eliminar.
