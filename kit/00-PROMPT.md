# Prompt de arranque

Este kit sirve para que otra persona construya **su propia versión de Paperflow**, con su propio Notion, Supabase y Vercel, en su computador y con Claude Code.

## Cómo usarlo

1. Copia la carpeta `kit/` completa a una carpeta vacía del nuevo proyecto (por ejemplo `C:\Users\<tú>\Documents\mi-paperflow\kit`).
2. *(Recomendado)* Si tienes acceso al código de Paperflow, cópialo en la misma carpeta o clónalo. Así Claude Code reutiliza lo que ya funciona en vez de partir de cero.
3. Abre una terminal en esa carpeta, ejecuta `claude` y pega el prompt de abajo, completo.
4. Responde las preguntas de la fase de descubrimiento con calma: de ellas sale cómo funcionará tu plataforma.

> No necesitas tener Notion ni un método de trabajo definido. El primer paso los arma contigo.

---

## Prompt (copiar desde aquí)

```text
Vas a ayudarme a construir mi propia versión de Paperflow: una app web personal para ver y
seguir mis tareas, con Notion como única fuente de verdad. En la carpeta kit/ están los
documentos del proyecto. Léelos todos antes de hacer nada, en este orden:

  kit/PRD.md               qué es el producto y qué debe hacer
  kit/DESCUBRIMIENTO.md    las preguntas para adaptar la plataforma a mi forma de trabajar
  kit/MODELO-NOTION.md     cómo se modela el trabajo en Notion (modelo de referencia y variantes)
  kit/BLUEPRINT.md         arquitectura, contrato de la API, seguridad y estructura de carpetas
  kit/DESIGN.md            sistema visual, componentes, sonidos y accesibilidad
  kit/PLAN.md              fases de implementación con criterios de aceptación
  kit/DESPLIEGUE.md        cuentas, secretos y despliegue paso a paso
  kit/CLAUDE.md            reglas de trabajo para este repo (cópialo a la raíz del proyecto)

Reglas para todo el proyecto:
- Háblame en español, en bloques numerados cortos y con una idea por línea.
- Trabaja por fases (kit/PLAN.md). Al terminar cada fase, muéstrame qué quedó, cómo lo
  probaste y espera mi visto bueno antes de seguir.
- Nunca me pidas que pegue en el chat tokens, contraseñas ni claves secretas. Cuando haga
  falta un secreto, dime dónde cargarlo (panel de Supabase, archivo .env.local) y yo lo hago.
- Nada de datos reales sensibles (pacientes, datos personales de terceros) en Notion
  ni en pruebas: solo datos inventados.
- Si en esta carpeta está el código de Paperflow, úsalo como base y adáptalo. Si no está,
  constrúyelo desde cero siguiendo BLUEPRINT.md y DESIGN.md.

Empieza por la FASE 0 · DESCUBRIMIENTO:
1. Entrevístame con las preguntas de kit/DESCUBRIMIENTO.md, de a un bloque por vez.
   Ofréceme opciones con la respuesta sugerida primero, para que pueda contestar rápido.
   Si una respuesta no queda clara, repregunta antes de seguir.
2. Con mis respuestas, completa la plantilla y escribe MODELO.md en la raíz del proyecto:
   vocabulario, bases de Notion con sus propiedades y estados, reglas de cierre, vistas
   activadas y formato del reporte.
3. Muéstrame un resumen del modelo y una vista previa en texto de cómo se verían mis
   pantallas "Hoy" y "Semana" con dos o tres tareas de ejemplo. Ajusta hasta que yo apruebe.
4. Recién con MODELO.md aprobado, pasa a la FASE 1 del plan.
```
