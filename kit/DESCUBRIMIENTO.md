# Descubrimiento · cómo trabajas

> **Fase 0** del plan. Claude Code hace estas preguntas **antes de escribir código o crear algo en Notion**.
> Objetivo: que la plataforma se adapte a la persona, no al revés.
> Resultado: un archivo `MODELO.md` aprobado (plantilla al final).

## Instrucciones para Claude Code

- Pregunta **de a un bloque por vez**. No más de 4 preguntas por mensaje.
- Ofrece opciones con la **sugerida primero**, para que la persona pueda contestar con una letra o "la sugerida".
- Si la persona dice "no sé" o "no tengo método", propón el **modelo de partida** (§ Modelo de partida) y pregunta solo lo que lo cambia.
- Si una respuesta contradice otra, repregunta.
- No asumas que trabaja con auditorías: es solo un ejemplo de *contenedor*.
- Al final, completa la plantilla `MODELO.md`, muestra una vista previa en texto de "Hoy" y "Semana" con datos inventados y ajusta hasta que la persona apruebe.

---

## Bloque A · Tu trabajo hoy

1. ¿Cuál es tu rol y en qué tipo de trabajo se te va la semana? (desarrollo, diseño, QA, gestión, soporte…)
2. ¿En cuántos proyectos o clientes trabajas a la vez? *(sugerida: 2 a 4)*
3. ¿Por dónde te llega el trabajo? (reuniones, chat, correo, tickets, auditorías o revisiones, ideas propias) Marca todas las que apliquen.
4. ¿Qué usas hoy para organizarte? (nada o la memoria, papel, notas del celular, Trello, Jira, Excel, Notion)

## Bloque B · Cómo agrupas el trabajo (el *contenedor*)

5. Cuando algo tiene varias tareas, ¿cómo lo llamas? *(sugerida: "Iniciativa")*
   - a) Iniciativa u objetivo · b) Épica o funcionalidad · c) Sprint · d) Auditoría o revisión · e) Cliente o encargo · f) Otro nombre
6. ¿Ese grupo tiene un **problema o meta inicial** que define cuándo está terminado? *(sugerida: sí, un campo "Meta")*
7. ¿Qué estados atraviesa el grupo? *(sugerida: Por empezar → En curso → Terminado, más "Detenido")*
8. ¿Quieres llevar también un **diario o bitácora** por proyecto (registro de lo que pasa, no tareas)? *(sugerida: no por ahora)*

## Bloque C · Las tareas

9. ¿Cómo llamas a una tarea dentro del grupo? *(sugerida: "Tarea"; en el original es "Pendiente")*
10. ¿Qué estados usas? *(sugerida: Abierta · Hecha · Descartada)*
    - Si quieres "En curso" o "Bloqueada", dilo: aparecerán como etiqueta en Hoy.
11. ¿Distingues tareas por importancia? *(sugerida: Tipo = Crítica / Secundaria)*
    - a) Crítica / Secundaria · b) Prioridad alta / media / baja · c) No distingo
12. ¿Las clasificas por naturaleza? *(sugerida: Categoría = Hacer ya · Espera decisión · Deuda técnica · QA)*
13. ¿Usas fechas límite? *(sugerida: no; "Para hoy" alcanza)*
14. Cuando cierras algo, ¿qué evidencia quieres guardar? *(sugerida: commit o enlace + quién cerró: Yo / Claude Code)*

## Bloque D · Tu día

15. ¿Te sirve elegir cada mañana qué tareas son "para hoy"? *(sugerida: sí, como máximo unas 5)*
16. Lo que quedó "para hoy" y no terminaste, ¿sigue arriba al día siguiente? *(sugerida: sí, con la marca "de ayer")*
17. ¿Separas trabajo y vida personal en la misma herramienta? *(sugerida: sí, Ámbito = Trabajo / Personal)*

## Bloque E · Tu semana y reportes

18. ¿Reportas tu avance a alguien? ¿A quién y cada cuánto? *(sugerida: semanal, a la jefatura)*
19. ¿En qué formato? *(sugerida: guion para decirlo en voz alta)*
    - a) Guion oral · b) Texto para pegar en Slack o correo · c) Tabla · d) No reporto
20. ¿Qué debe incluir? *(sugerida: lo cerrado por grupo, lo que queda abierto y los grupos sin avance)*

## Bloque F · Lo espontáneo y las notas

21. ¿Te piden cosas al pasar, que no pertenecen a ningún grupo? *(sugerida: sí, "Tareas sueltas" en su propia base)*
22. ¿Quieres un **cuaderno** para notas libres, con imágenes? *(sugerida: sí)*

## Bloque G · Automatización con Claude

23. ¿Usarás Claude Code en tus repos? Si sí, ¿quieres que **cierre tareas** en Notion al terminar, con el commit como evidencia? *(sugerida: sí)*
24. ¿Quieres que te **sugiera tareas de otros grupos** que tocan el mismo código que estás trabajando? *(sugerida: sí, como máximo 3, y tú decides)*
25. ¿Quieres una **revisión nocturna** automática (solo lectura) que cruce todo y deje un informe? *(sugerida: más adelante)*

## Bloque H · Apariencia

26. ¿Te gusta la estética de papeles sobre una mesa, o prefieres otra? *(sugerida: papel, ver DESIGN.md)*
27. ¿Tema claro, oscuro o según el sistema? *(sugerida: según el sistema, con botón para cambiarlo)*
28. ¿Sonidos en las acciones? *(sugerida: sí, suaves)*
29. ¿Cómo quieres que se llame tu plataforma? *(sugerida: Paperflow)*

## Bloque I · Cuentas y restricciones

30. ¿Tienes cuenta de Notion, Supabase, Vercel y GitHub? (las que falten se crean en la fase de despliegue; todas tienen plan gratuito)
31. ¿Con qué correo vas a entrar a la app?
32. ¿Hay datos que **nunca** deben quedar en Notion? *(sugerida: datos reales de pacientes, clientes o personas)*

---

## Modelo de partida

Si la persona no tiene método, se propone este, que es el original simplificado:

- **Iniciativas** (contenedor): Nombre · Proyecto · Ámbito · Estado (Por empezar / En curso / Terminado / Detenido) · Meta · Inicio · Página.
- **Tareas**: Título · Iniciativa (relación) · Tipo (Crítica / Secundaria) · Categoría · Estado (Abierta / Hecha / Descartada) · Para hoy (fecha) · Fecha de cierre · Cerrado por (Yo / Claude Code / Claude) · Evidencia · Nota.
- **Tareas sueltas**: Título · Proyecto · Ámbito · Estado · Para hoy · Fecha de cierre · Cerrado por · Evidencia · Nota.
- **Cuaderno**: Título · Contenido · Proyecto · Fijada.
- Reporte semanal en formato guion oral.

## Cómo cada respuesta cambia la plataforma

| Respuesta | Qué cambia |
|---|---|
| Nombre del contenedor (5) y de la tarea (9) | Textos de la interfaz, nombres de las bases y la página de instrucciones de Claude Code |
| Estados (7, 10) | Opciones en Notion y **roles** en `modelo.ts`: qué estado es "abierto", "hecho" o "descartado" |
| Importancia (11) | Orden de las tareas en Hoy y color o etiqueta (siempre con palabra) |
| Categoría (12) | Etiqueta en la tarjeta; "Espera decisión" se agrupa aparte |
| Fechas límite (13) | Propiedad extra y aviso "vence hoy" en Hoy |
| Para hoy (15, 16) | Sección "Para hoy" y arrastre de "de ayer" |
| Ámbito (17) | Selector Trabajo / Personal; si es "no", desaparece |
| Reporte (18 a 20) | Vista Semana y formato del guion; si "no reporto", Semana queda como resumen personal |
| Tareas sueltas y cuaderno (21, 22) | Activan o desactivan esas secciones y sus bases |
| Claude (23 a 25) | Página de instrucciones, campo Evidencia y "Cerrado por", y revisión nocturna |
| Apariencia (26 a 29) | Tokens de DESIGN.md, sonidos y nombre |

---

## Plantilla · MODELO.md

> Claude Code la completa y la guarda en la raíz del proyecto. Es la **fuente de verdad del modelo**: de aquí salen las bases de Notion y `modelo.ts`.

```markdown
# MODELO · <nombre de la plataforma>

## Persona
- Rol:
- Correo autorizado:
- Proyectos (opciones de la propiedad Proyecto):
- Ámbitos: <Trabajo / Personal> | no usa

## Vocabulario
| Genérico      | Se llama          | Plural           |
|---------------|-------------------|------------------|
| contenedor    |                   |                  |
| tarea         |                   |                  |
| tarea suelta  |                   |                  |
| nota          |                   |                  |

## Bases de Notion
### <Contenedor>
| Propiedad | Tipo | Opciones / notas |
|---|---|---|
### <Tarea>
| Propiedad | Tipo | Opciones / notas |
|---|---|---|
### <Tarea suelta>  (si aplica)
### <Cuaderno>      (si aplica)
### <Revisiones>    (si aplica)

## Roles de estado (los usa la lógica de la app)
- Tarea · abierta: <opción>
- Tarea · hecha: <opción>
- Tarea · descartada: <opción>
- Tarea · otros visibles en Hoy: <opciones> (ej. En curso, Bloqueada)
- Contenedor · activo: <opciones>
- Contenedor · terminado: <opción>
- Contenedor · detenido: <opción>
- Importancia (orden en Hoy, de mayor a menor): <opciones>

## Reglas de cierre
- Quién puede cerrar: <Yo / Claude Code / Claude>
- Evidencia: <commit | enlace | nota>
- Claude Code: cierra solo si está verificado y en un commit | nunca descarta | propone nuevas tareas

## Vistas activadas
- [ ] Hoy · Para hoy (máx. N)
- [ ] Hoy · Tareas sueltas
- [ ] Hoy · Por <contenedor>
- [ ] Semana · formato: <guion oral | texto | tabla>
- [ ] Cuaderno (con imágenes)
- [ ] Revisión nocturna

## Apariencia
- Estética: <papel | otra>
- Tema: <sistema | claro | oscuro>
- Sonidos: <sí | no>

## Datos prohibidos
- <ej. datos reales de pacientes>
```
