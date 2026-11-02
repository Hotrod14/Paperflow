# Plan de implementación

> Fases cortas, cada una con algo que se puede probar. **Al terminar cada fase**: demo, cómo se probó y visto bueno de la persona antes de seguir.
> Si se parte del código de Paperflow, muchas fases son de **adaptación** y no de construcción: igual se recorren para verificar.

## Fase 0 · Descubrimiento
- Entrevista con `DESCUBRIMIENTO.md`, de a un bloque por vez.
- Escribir `MODELO.md` con la plantilla.
- Vista previa en texto de Hoy y Semana con datos inventados.

✅ **Listo cuando**: la persona aprueba `MODELO.md`.

## Fase 1 · Cuentas y Notion
- Crear las cuentas que falten (`DESPLIEGUE.md` §1).
- Conectar el MCP de Notion a Claude Code.
- Crear la página madre, las bases, las relaciones y las vistas guardadas según `MODELO.md` (`MODELO-NOTION.md` §5).
- Cargar 3 a 5 contenedores y unas 10 tareas de ejemplo, inventadas.
- La persona crea la integración interna, guarda el token en su gestor y la conecta a la página madre.
- Anotar en `MODELO.md` los ids de cada base.

✅ **Listo cuando**: las bases existen con las propiedades exactas, hay datos de ejemplo y la integración está conectada.

## Fase 2 · Esqueleto del repo
- Repo en GitHub (privado). Vite + React + TS. `CLAUDE.md` en la raíz.
- `supabase/functions/_shared/modelo.ts` generado desde `MODELO.md`.
- Tipos del dominio, `mapeo.ts` (Notion ⇄ app) y tests de mapeo con páginas de ejemplo.
- `vista.ts` con `construirHoy` y `construirSemana` usando **roles** de `modelo.ts`, con tests.

✅ **Listo cuando**: `npm test` pasa, con casos de roles personalizados, "de ayer", sueltas y 💤.

## Fase 3 · Función y login
- Proyecto en Supabase. Registro cerrado y usuario creado a mano.
- Función con `leer`, `actualizarTarea`, `actualizarContenedor` y `crearTarea`, más auth, CORS, lista blanca y validación de padre.
- Secretos cargados por la persona desde el panel.
- Desplegar la función. Frontend con Login (enlace mágico) y lectura real.

✅ **Listo cuando**: entra el correo autorizado, otro correo recibe `403`, y la app muestra los datos de Notion.

## Fase 4 · Hoy
- Para hoy · Tareas sueltas · Por contenedor.
- Marcar hecha con deshacer, enviar o quitar de hoy, detalle, "copiar para Claude Code", "+ tarea suelta".
- Copia local, relectura cada 3 minutos y banda de error.

✅ **Listo cuando**: un cierre en la app aparece en Notion con fecha y "Cerrado por", y deshacer lo revierte.

## Fase 5 · Semana
- Bloques por contenedor (✅ · 📌 · 💤), lista para elegir y guion en el formato elegido (oral, texto o tabla), con botón copiar.

✅ **Listo cuando**: el guion de la semana de ejemplo se lee bien en voz alta, en menos de 2 minutos.

## Fase 6 · Diseño completo
- Tokens, papeles, sellos, tema claro y oscuro sin parpadeo, fondos, menú de perfil y celular (`DESIGN.md`).
- Sonidos (si se eligieron).
- Revisión visual con capturas (`DESIGN.md` §10).

✅ **Listo cuando**: las capturas pasan la revisión de contraste y alineación en todas las combinaciones.

## Fase 7 · Cuaderno (si se eligió)
- Base de notas. Acciones `leerNotas`, `crearNota`, `actualizarNota`, `eliminarNota` y `restaurarNota`.
- Vista cuaderno: índice, hoja, menú, editor y atajos.
- Imágenes: `subirImagen` y `leerImagenes`, compresión, marcas, visor y renovación de enlaces (`BLUEPRINT.md` §7).

✅ **Listo cuando**: se crea, edita, fija y arranca una nota con deshacer, y una captura pegada se ve en la app y en Notion, también después de una hora.

## Fase 8 · Despliegue
- Vercel conectado al repo, con variables cargadas.
- URL de Vercel en `ALLOWED_ORIGINS` y en las URL de redirección de Supabase.
- Prueba completa desde el celular.

✅ **Listo cuando**: la app funciona en producción con el enlace mágico.

## Fase 9 · Claude Code y automatización
- Página "Instrucciones para Claude Code" en Notion y fragmento en el `CLAUDE.md` global (`MODELO-NOTION.md` §6).
- Prueba: en otro repo, Claude Code cierra una tarea de ejemplo con el hash del commit.
- *(Opcional)* Revisión nocturna: tarea programada de Claude, de lunes a viernes, **solo lectura**, que escribe en la base Revisiones.

✅ **Listo cuando**: un cierre hecho por Claude Code aparece en Hoy como hecho y en Semana con su evidencia.

## Fase 10 · Entrega
- README con la puesta en marcha y la arquitectura.
- Registro de decisiones (bitácora) en Notion: qué se eligió y por qué.
- Lista de mejoras pendientes.

---

## Reglas durante todo el plan
- Commits pequeños, con mensaje en español que diga el porqué.
- Antes de cada entrega: `npm test`, `npm run build`, `deno check` y capturas.
- Nunca pedir ni mostrar secretos. Nunca datos reales sensibles.
- Una escritura en Notion que borre algo pide confirmación explícita.
