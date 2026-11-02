# Despliegue paso a paso

> Pensado para Windows con PowerShell; en Mac o Linux los comandos son iguales.
> **Regla de oro**: los secretos los pega la persona directamente en el panel correspondiente o en `.env.local`. Nunca en el chat, en Notion ni en un commit.

## 1. Cuentas (todas tienen plan gratuito)

| Servicio | Para qué | Enlace |
|---|---|---|
| Notion | Datos (fuente de verdad) | <https://www.notion.so> |
| GitHub | Repositorio | <https://github.com> |
| Supabase | Login y función | <https://supabase.com> |
| Vercel | Publicar la web | <https://vercel.com> (entrar con GitHub) |
| Gestor de contraseñas | Guardar el token de Notion | Bitwarden u otro |

Herramientas locales: **Node.js LTS**, **Git** y **Claude Code**. La CLI de Supabase se usa con `npx`, sin instalar.

## 2. Notion

1. Crear el modelo (`MODELO-NOTION.md` §5).
2. Crear la **integración interna** con capacidades de leer, actualizar e insertar.
3. Copiar el token `ntn_…` → **al gestor de contraseñas**.
4. Página madre → `···` → **Conexiones** → agregar la integración.

## 3. Supabase

1. **Nuevo proyecto**: anotar el *project ref* (está en la URL: `https://<ref>.supabase.co`).
2. *Authentication → Providers → Email*: enlace mágico activo.
3. *Authentication → Sign In / Providers*: **desactivar "Allow new users to sign up"**.
4. *Authentication → Users → Add user*: crear el usuario con el correo autorizado.
5. *Edge Functions → Secrets* (desde el panel, así nada queda en el historial de la terminal):
   - `NOTION_TOKEN` = token de Notion
   - `ALLOWED_EMAIL` = correo autorizado
   - `ALLOWED_ORIGINS` = `http://localhost:5173` (en el paso 4 se suma la URL de Vercel)
6. Desplegar la función desde la carpeta del proyecto:

```powershell
npx supabase login
npx supabase link --project-ref <ref>
npx supabase functions deploy <nombre-funcion>
```

> Si PowerShell bloquea `npx`, usar `npx.cmd`.
> Si sale `401 … Cannot find project ref`, hay que repetir `login` y `link` en ese computador.
> **Cada cambio en `supabase/functions/`** exige volver a correr `git pull` y luego `deploy`. Los cambios del frontend no lo necesitan.

## 4. Vercel

1. **Add New → Project** → importar el repo. Vercel detecta Vite solo.
2. Variables de entorno:
   - `VITE_SUPABASE_URL` = `https://<ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = clave *anon* o *publishable* (pública; está en Settings → API)
3. Desplegar. Cada `git push` a `main` vuelve a desplegar.
4. En Supabase:
   - *Authentication → URL Configuration*: **Site URL** = URL de Vercel; agregarla también en **Redirect URLs**.
   - *Edge Functions → Secrets*: `ALLOWED_ORIGINS` = `https://<app>.vercel.app,http://localhost:5173`.

## 5. Local

```powershell
copy .env.example .env.local   # completar las dos variables VITE_
npm install
npm run dev                    # http://localhost:5173
npm test
```

## 6. Claude Code ↔ Notion

```powershell
claude mcp add --transport http notion https://mcp.notion.com/mcp
```

Luego, en Claude Code, `/mcp` → autorizar Notion en el navegador.

Y agregar el fragmento de `MODELO-NOTION.md` §6 al `CLAUDE.md` global: `C:\Users\<usuario>\.claude\CLAUDE.md`.

## 7. Verificación final

- [ ] Login con el correo autorizado: entra.
- [ ] Con otro correo: no llega el enlace, o la función responde 403.
- [ ] Marcar una tarea en la app cambia Notion (Estado, Fecha de cierre, Cerrado por).
- [ ] Desconectar la integración en Notion muestra la banda "No pude leer Notion…" con la copia local.
- [ ] Desde el celular se ve bien.
- [ ] Ningún secreto en el repo: `git grep -n "ntn_"` sin resultados.

## 8. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `supabase` no se reconoce | CLI no instalada | Usar `npx supabase …` |
| 401 al desplegar | Sesión de la CLI vencida o carpeta sin vincular | `npx supabase login` y luego `link` |
| La app dice "No encontrado en Notion" | Falta conectar la integración a la página madre | `···` → Conexiones |
| Error de CORS en la consola | Falta la URL en `ALLOWED_ORIGINS` | Agregarla en Secrets, sin barra final |
| Las imágenes del cuaderno dan "Request has expired" | Enlace de Notion vencido (dura 1 h) | La app lo renueva sola; no usar enlaces directos |
| El enlace mágico lleva a localhost | Falta la Site URL | Authentication → URL Configuration |
