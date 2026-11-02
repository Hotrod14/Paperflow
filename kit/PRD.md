# PRD · Paperflow (versión personal)

> Documento de requisitos del producto. Describe **qué** se construye y **por qué**. El **cómo** está en `BLUEPRINT.md` y `DESIGN.md`.
> Los nombres en *cursiva* (contenedor, tarea, tarea suelta) son genéricos: los nombres reales salen de `MODELO.md` (fase de descubrimiento).

## 1. Problema

- El trabajo vive repartido en Notion, chats, reuniones y la memoria.
- Navegar Notion para saber "qué hago hoy" es lento, y armar el reporte semanal toma tiempo.
- Cuando un asistente de código (Claude Code) termina algo, nadie lo registra, o se registra a mano tarde.

## 2. Propuesta

Una app web personal, con estética de **papeles sobre una mesa**, que:

1. **Lee** el trabajo desde Notion (fuente única de verdad) y lo muestra ordenado para hoy y para la semana.
2. Permite **cerrar, enfocar y crear** tareas en pocos clics, escribiendo de vuelta en Notion.
3. Arma solo el **resumen semanal** listo para leer en voz alta o pegar.
4. Deja que **Claude Code** cierre tareas en Notion con evidencia (commit), siguiendo reglas escritas en una página de instrucciones.

## 3. Usuario

- **Una sola persona**: la dueña de la instalación. No es multiusuario: solo un correo autorizado puede entrar.
- Perfil: persona técnica (desarrollo, diseño o liderazgo) que lleva varios proyectos a la vez y reporta a alguien con regularidad.
- Su método de trabajo **no está fijo**: lo define la fase de descubrimiento (`DESCUBRIMIENTO.md`).

## 4. Conceptos

| Concepto genérico | Qué es | Ejemplo en el Paperflow original |
|---|---|---|
| *Contenedor* | Agrupa trabajo con un objetivo. Tiene estado propio. | Auditoría o bitácora |
| *Tarea* | Unidad cerrable. Pertenece a un contenedor. | Pendiente |
| *Tarea suelta* | Algo espontáneo, sin contenedor. | "Revisar links de Ruta Digital" |
| *Proyecto* | Etiqueta para agrupar contenedores y tareas. | Kefuri, Ruta Digital |
| *Ámbito* | Separación opcional de mundos. | Trabajo / Personal |
| *Nota* | Apunte libre, con texto e imágenes. | Cuaderno de notas |

## 5. Funcionalidades

Prioridad: **P0** = imprescindible para la primera versión · **P1** = siguiente · **P2** = opcional según el descubrimiento.

### 5.1 Acceso (P0)
- Login con enlace mágico al correo (sin contraseña). Solo entra el correo autorizado.
- El token de Notion nunca llega al navegador.

### 5.2 Hoy (P0)
- **Para hoy**: tareas que la persona eligió para el día ("en foco"). Lo no terminado de días anteriores sigue arriba con la marca "de ayer".
- **Tareas sueltas**: su propio apartado, sobre los contenedores.
- **Por contenedor**: cada contenedor abierto con sus tareas abiertas, ordenadas por tipo o prioridad.
- Acciones en cada tarea: marcar hecha (con deshacer), enviar o quitar de "para hoy", ver el detalle y abrir en Notion.
- Botón **copiar para Claude Code**: arma la instrucción para que Claude Code cierre esa tarea.
- Filtro por *ámbito*, si se usa.

### 5.3 Semana (P0)
- Lo cerrado en los últimos 7 días, agrupado por contenedor, con lo que queda abierto.
- Contenedores sin cierres: marcados con 💤, para que se note que no hubo avance.
- **Guion del reporte**: texto estructurado, listo para leer en voz alta o copiar. Con una lista para elegir qué contenedores incluir.

### 5.4 Tareas sueltas (P0)
- Botón **+ tarea suelta**: título, proyecto, ámbito y "para hoy".
- Se guardan en su propia base de Notion, no en la de contenedores.

### 5.5 Cuaderno de notas (P1)
- Notas con título, texto libre, proyecto y opción de fijarlas arriba.
- Crear, editar, fijar y eliminar (con confirmación y deshacer). Eliminar manda a la papelera de Notion.
- Pegar imágenes (Ctrl+V, arrastrar o botón). Se guardan en la página de Notion de la nota. Visor a pantalla completa.
- Búsqueda sin distinguir tildes y filtro por proyecto.

### 5.6 Apariencia (P1)
- Tema claro y oscuro: sigue al sistema hasta que la persona elija.
- Fondos de mesa a elección (paletas armónicas y una foto de madera).
- Sonidos suaves de papel y lápiz en las acciones clave.
- Menú de perfil con Perfil, Tema y Ajustes.

### 5.7 Integración con Claude Code (P1)
- Página en Notion **"Instrucciones para Claude Code"**: qué es la plataforma, cómo cerrar tareas (estado, fecha, cerrado por, evidencia), límites y cómo recomendar tareas relacionadas de otros contenedores cuando toca el mismo código.
- Fragmento para el `CLAUDE.md` global de la persona que apunta a esa página.

### 5.8 Revisión nocturna (P2)
- Tarea programada de Claude, de lunes a viernes, **solo lectura**. Cruza contenedores, tareas y tareas sueltas, y deja un informe en una base "Revisiones": relacionadas, duplicados, incoherencias de estado, tareas sin movimiento y lo cerrado en el día.

## 6. Fuera de alcance

- Varias personas o equipos, permisos o roles.
- Edición completa de contenedores o tareas desde la app (eso se hace en Notion), salvo los campos de la sección 5.
- Notificaciones push o correo (más allá de la revisión nocturna).
- App nativa: es web, adaptada a celular.

## 7. Requisitos no funcionales

- **Seguridad**: secretos solo en el servidor; escritura limitada a una lista de campos permitidos y solo en páginas de las bases propias. Ver `BLUEPRINT.md` §6.
- **Rendimiento**: primera vista con copia local inmediata; lectura fresca en segundo plano; caché de 45 s en la función.
- **Resiliencia**: si Notion falla, se muestra la última copia con un aviso claro. Las escrituras son optimistas y se revierten si fallan.
- **Accesibilidad**: contraste AA, foco visible, todo usable con teclado, el color nunca es la única señal y se respeta `prefers-reduced-motion`.
- **Datos**: nada sensible real (pacientes, datos personales de terceros).

## 8. Criterios de éxito

- Saber qué hacer hoy en menos de 10 segundos al abrir la app.
- Armar el reporte semanal en menos de 2 minutos.
- Toda tarea cerrada por Claude Code queda con fecha y evidencia, sin intervención manual.
- Cero secretos en el repositorio o en el navegador.

## 9. Preguntas abiertas (se resuelven en el descubrimiento)

- ¿Cómo se llama y cómo se estructura el *contenedor* para esta persona?
- ¿Qué estados y tipos de tarea usa?
- ¿Reporta? ¿A quién, cada cuánto y en qué formato?
- ¿Separa trabajo y vida personal?
- ¿Quiere cuaderno, revisión nocturna, sonidos?
