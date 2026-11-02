# CLAUDE.md · reglas de trabajo en este repo

> Copiar a la raíz del proyecto. Claude Code lo lee en cada sesión.

## Proyecto
- App web personal para ver y seguir tareas. **Notion es la única fuente de verdad.**
- Documentos: `MODELO.md` (modelo de esta persona) y `kit/` (PRD, BLUEPRINT, DESIGN, PLAN, DESPLIEGUE).
- Ante una duda de producto → `kit/PRD.md`. De arquitectura → `kit/BLUEPRINT.md`. Visual → `kit/DESIGN.md`. De modelo → `MODELO.md`.

## Cómo hablarme
- En español, en bloques numerados cortos y con una idea por línea.
- Al terminar algo: qué cambió, cómo lo probaste y si hay que volver a desplegar la función.

## Código
- Nombres en español, como en el resto del código (`construirHoy`, `cerradoPor`).
- Los nombres de Notion **solo** en `supabase/functions/_shared/modelo.ts`. La lógica usa **roles** (abierta, hecha, descartada), nunca textos fijos.
- La lógica de vistas va pura en `src/lib/` y con tests.
- La función valida todo: sesión, correo, lista blanca de campos y padre de la página.
- Escrituras optimistas con reversión y aviso; lo destructivo, con deshacer.
- `localStorage` siempre dentro de try/catch.
- Sin librerías de UI: CSS propio con los tokens de `DESIGN.md`.

## Antes de entregar
1. `npm test`
2. `npm run build`
3. `deno check` de la función, si se tocó `supabase/`
4. Capturas en claro, oscuro y celular si cambió algo visual
5. Avisar si hay que correr `npx supabase functions deploy <nombre>`

## Límites
- Nunca pedir, mostrar ni commitear secretos (token de Notion, service_role, contraseñas).
- Nunca datos reales sensibles en Notion ni en pruebas.
- No borrar nada en Notion sin confirmación explícita. La eliminación va a la papelera, que es recuperable.
- No cambiar el modelo de Notion sin actualizar antes `MODELO.md` y pedir el visto bueno.

## Git
- Commits pequeños, con mensaje en español que diga el porqué.
- `git pull` antes de empezar: puede que yo haya subido cambios desde otro lado.
