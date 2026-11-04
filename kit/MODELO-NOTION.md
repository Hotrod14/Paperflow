# Modelo en Notion

> Notion es la **única fuente de verdad**: la app no guarda datos propios, solo una caché de unos segundos y una copia local en el navegador.
> Aquí está el modelo de referencia (el Paperflow original), cómo se generaliza y cómo se crea en Notion.

## 1. Estructura

```
📄 <Plataforma> — Trabajo                 ← página madre (se conecta a la integración)
 ├─ 🤖 Instrucciones para Claude Code     ← página (ver §6)
 ├─ 🗃️ <Contenedores>                     ← base
 ├─ 🗃️ <Tareas>                           ← base, relación → Contenedores
 ├─ 🗃️ Tareas sueltas                     ← base (opcional)
 ├─ 🗃️ Cuaderno de notas                  ← base (opcional)
 └─ 🗃️ Revisiones nocturnas               ← base (opcional)
```

- **Todas las bases cuelgan de una misma página madre.** Al conectar la integración a esa página, quedan compartidas todas.
- Cada base se identifica por su **data source id** (API de Notion `2025-09-03`) y por su **database id**. Los dos van en `modelo.ts` (ver `BLUEPRINT.md` §5).

## 2. Modelo de referencia (Paperflow original)

### Auditorías (*contenedor*)
| Propiedad | Tipo | Opciones |
|---|---|---|
| Nombre | título | |
| Proyecto | select | Kefuri, Ruta Digital, Paperflow, Tecnopolis, Cap Ideas, Otro |
| Ámbito | select | Trabajo, Personal |
| Tipo de origen | select | Auditoría, Bitácora |
| Estado | select | En diagnóstico, Crítico en curso, Crítico ejecutado, Todo ejecutado, Detenida |
| Problema crítico | texto | Lo que define qué es crítico |
| Inicio · Última actividad | fecha | |
| Página | url | Enlace al documento de la auditoría |
| Pendientes | relación | ↔ Pendientes.Origen |

### Pendientes (*tarea*)
| Propiedad | Tipo | Opciones |
|---|---|---|
| Pendiente | título | |
| Origen | relación | → Auditorías |
| Tipo | select | Crítico, Secundario |
| Categoría | select | Hacer ya, Espera decisión, Deuda técnica, QA |
| Estado | select | Abierto, Hecho, Descartado |
| En foco | fecha | Día en que se eligió "para hoy" |
| Fecha de cierre | fecha | |
| Cerrado por | select | Yo, Claude Code, Claude |
| Evidencia | texto | Commit, enlace o nota de cierre |
| Nota | texto | |
| Afecta pantallas · Avisado a diseño | casilla | Específico del original: opcional |
| Proyecto · Ámbito | rollup | Desde Origen |

### Tareas sueltas
Tarea · Proyecto · Ámbito · Estado · Fecha de cierre · Cerrado por · Evidencia · Nota · En foco.

### Cuaderno de notas
Título · Contenido (texto, hasta 20.000 caracteres) · Proyecto (incluye "General") · Fijada (casilla). Las fechas de creación y edición vienen de la página. Las imágenes van como bloques en el cuerpo de la página (ver `BLUEPRINT.md` §7).

### Revisiones nocturnas
Título ("Revisión AAAA-MM-DD") · Fecha · Resumen · Cuerpo con hallazgos y propuestas.

## 3. Reglas del modelo

- Una tarea **siempre** pertenece a un contenedor (relación obligatoria). Lo que no tiene contenedor es una tarea suelta.
- **Crítica** = parte del problema o meta inicial del contenedor. **Secundaria** = apareció en el camino.
- Ámbito Trabajo y Personal **no se mezclan** en las vistas.
- Al cerrar se registran siempre: Estado = hecho · Fecha de cierre · Cerrado por · Evidencia.
- Desde la app, la persona puede eliminar tareas y notas: van a la papelera de Notion, con confirmación y deshacer. Los contenedores no se eliminan desde la app. Claude Code nunca elimina.
- Sin datos reales sensibles.

## 4. Cómo se generaliza

La lógica de la app no depende de los **nombres** sino de los **roles**. `MODELO.md` define el nombre de cada cosa y `modelo.ts` traduce:

| Rol en la lógica | Ejemplo original | Ejemplo alternativo |
|---|---|---|
| contenedor | Auditoría | Iniciativa, Épica, Sprint, Cliente |
| tarea | Pendiente | Tarea, Ítem, Ticket |
| estado tarea · abierta | Abierto | Por hacer, En curso |
| estado tarea · hecha | Hecho | Lista, Completada |
| estado tarea · descartada | Descartado | Cancelada |
| importancia | Tipo: Crítico / Secundario | Prioridad: Alta / Media / Baja |
| foco del día | En foco (fecha) | Para hoy (fecha) |
| contenedor · activo | En diagnóstico, Crítico en curso… | En curso |
| contenedor · terminado | Todo ejecutado | Terminado |

**Reglas para adaptar**:
- Puede haber **varios estados "abiertos"** (Por hacer, En curso, Bloqueada): todos se ven en Hoy y el nombre aparece como etiqueta.
- Debe haber **exactamente un estado "hecha"**: es el que cuenta para Semana.
- El "foco del día" es **fecha**, no casilla: así se sabe si viene "de ayer".
- Si la persona no usa ámbitos, la propiedad no se crea y la app oculta el selector.

## 5. Crear el modelo en Notion

### Opción A · Con Claude Code y el MCP de Notion (recomendada)
1. Conectar el MCP oficial de Notion a Claude Code: `claude mcp add --transport http notion https://mcp.notion.com/mcp` y autorizar en el navegador.
2. Claude Code crea la página madre, las bases con sus propiedades y opciones exactamente como dice `MODELO.md`, y las relaciones.
3. Claude Code crea vistas guardadas "Hoy" (tareas abiertas) y "Cerradas · 7 días" en cada base. Le sirven para leer después sin depender de consultas SQL, que algunos planes de Notion no permiten.
4. Claude Code anota en `MODELO.md` los **data source id** y **database id** de cada base.
5. Carga 3 a 5 tareas de ejemplo con datos inventados, para probar.

### Opción B · A mano
Crear cada base en Notion con las propiedades de `MODELO.md`, copiar los ids desde la URL (`notion.so/<database id>?v=…`) y pedirle a Claude Code que obtenga los data source id con el MCP.

### Integración interna (para la app)
1. <https://www.notion.so/profile/integrations> → **Nueva integración** → tipo *Interna*.
2. Capacidades: **leer**, **actualizar** e **insertar** contenido. Insertar se usa para tareas sueltas, notas e imágenes.
3. Copiar el token (`ntn_…`) **directo al gestor de contraseñas** (Bitwarden u otro). Nunca a una página de Notion ni al chat.
4. En la página madre: `···` → **Conexiones** → agregar la integración.

## 6. Página "Instrucciones para Claude Code"

Claude Code la crea en la página madre, adaptada al vocabulario de `MODELO.md`, con estas secciones:

1. **Qué es la plataforma**: Notion como fuente de verdad, vistas Hoy y Semana, sin datos sensibles.
2. **Cómo está organizado**: cada base con su data source id, campos clave y estados.
3. **Al empezar a trabajar**: identificar el contenedor y leer sus tareas abiertas; si hay ambigüedad, preguntar.
4. **Cerrar una tarea**: solo si está hecha, verificada y en un commit. Estado = hecha · Fecha de cierre = hoy · Cerrado por = Claude Code · Evidencia = hash del commit. Si quedó a medias, no se cierra: se anota en Nota lo que falta. Nunca se descarta ni se borra por cuenta propia. Lo nuevo que se descubra se **propone** como tarea secundaria.
5. **Recomendar trabajo relacionado**: al tocar un archivo, buscar tareas abiertas de **otros** contenedores del mismo proyecto que mencionen ese archivo, componente o lógica. Sugerir como máximo 3, con la razón y el esfuerzo estimado, sin implementarlas; la persona decide.
6. **Límites**: no borrar, no mezclar ámbitos, no editar Revisiones ni Cuaderno, y lo que pida la persona en el momento manda.

Arriba de la página madre va un aviso: *"Claude Code: antes de leer o escribir en estas bases, lee Instrucciones para Claude Code"*.

Y en el `CLAUDE.md` **global** de la persona (`~/.claude/CLAUDE.md`, en Windows `C:\Users\<usuario>\.claude\CLAUDE.md`):

```markdown
## <Plataforma>
Llevo mis tareas en Notion, en la página "<Plataforma> — Trabajo".
Antes de leer o escribir en esas bases, lee la página "Instrucciones para Claude Code":
<URL de la página>
Sigue esas reglas para cerrar tareas y recomendar trabajo relacionado.
```
