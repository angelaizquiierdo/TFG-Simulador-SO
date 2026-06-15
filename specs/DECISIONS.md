# DECISIONS.md

Documentar el motivo de ese cambio de decisión: Si durante trabajo hay algo de la especificación que ves que estaba mal o decides diferente, le dices que corrija la especificación.

---

## 07-06-2026 - ADR: Restricción de Autonomía y Prevención de Bucles (Doom Loops) en Agente IA

### 1. Contexto y Problema
Durante el desarrollo asistido con Claude Code, se observó que ante fallos ambiguos de terminal —específicamente errores en la instalación de paquetes (npm install) o interrupciones por latencia (timeouts) al ejecutar herramientas de validación global cruzando el sistema de archivos de WSL2— el agente entraba en un estado de bucle infinito (conocido como doom loop).
En lugar de detenerse, la IA intentaba resolver el problema mediante ensayo y error autónomo: descargando el código fuente de paquetes externos, alterando configuraciones globales, o intentando ejecutar comandos de mantenimiento de dependencias (npm audit fix), alejándose completamente de la tarea asignada y consumiendo recursos y cuota innecesariamente.

### 2. Decisión Tomada
Se decidió tratar al archivo CLAUDE.md no solo como una guía de estilo, sino como un contrato de operaciones restrictivo (añadiendo una sección formal de Decisiones Operativas y de Entorno). Se implementaron tres restricciones sistémicas:

1. Regla de los 3 Strikes (Fail Fast): Se limitó a un máximo de 3 intentos la capacidad del agente para corregir errores de sintaxis tras un fallo de validación. Superado el límite, se le obliga a abortar y devolver el control al usuario.

2. Protocolo contra Timeouts (WSL2): Se instruyó al agente para que deje de interpretar los timeouts globales como errores de código. En su lugar, debe recurrir a la validación aislada del archivo modificado.

3. Bloqueo de Mantenimiento: Se retiraron explícitamente los permisos tácitos para alterar versiones de dependencias o modificar archivos estructurales sin orden directa.

### 3. Consecuencias

* **Positivas:** Se elimina la ambigüedad operativa. El proyecto queda protegido contra modificaciones "fantasma" en el árbol de dependencias, y se detiene el desperdicio de cuota de la IA en tareas de depuración inútiles.
* **Negativas:** El flujo de trabajo requerirá más intervención manual por parte del desarrollador. Cuando ocurra un problema real de infraestructura o un conflicto complejo de dependencias, el agente se rendirá rápidamente (al tercer intento), obligando al desarrollador a resolverlo fuera del flujo automatizado.

---

## 08-06-2026 - Cubrimiento de código

### 1. Contexto y Problema
No se conocía el cubrimiento de código para que una persona pueda comprobar si el código estaba bien.

### 2. Decisión Tomada
El simulador tenga un cubrimiento de código del 90 % respecto al componente que es de 80 % de cubrimiento. Los respectivos cambios se realizaron en PLAN.md (añadir los paquetes `@vitest/coverage-v8`) y en CLAUDE.md (especificar umbrales y qué pasa si no se alcanzan).

### 3. Consecuencias
* **Positivas:** Mayor control de la cobertura del código, evitar excepciones no cubiertas, mejorar la calidad y conocer mejor dónde falla.

---

## 10-06-2026 - Commit por fase, no por tarea

### 1. Contexto y Problema
Hacer commit después de cada tarea individual generaba un historial de git muy granular.

### 2. Decisión Tomada
El commit se hace al finalizar la fase completa. Mensajes breves: `fase-0: andamiaje`, `fase-1: tipos`, etc.

### 3. Consecuencias
* **Positivas:** Historial de git limpio y revertible por bloques coherentes.
* **Negativas:** Si hay un error a mitad de fase, se pierde más trabajo al revertir.
---

## 11-06-2026 - Visualización del diagrama de Gantt como matriz

### 1. Contexto y Problema
El diagrama de Gantt clásico (barras horizontales) no muestra claramente el estado de cada proceso en cada tick. Para una herramienta didáctica interesa ver en cada instante qué hace cada proceso.

### 2. Decisión Tomada
El GanttChart se renderiza como una **matriz** (filas: procesos, columnas: ticks). Cada celda tiene un color de fondo según el estado del proceso: en CPU (color sólido), en espera (color claro), no llegado (vacío), inactividad (gris). Colores asignados automáticamente de una paleta de mínimo 7 colores.

### 3. Consecuencias
* **Positivas:** Visualización clara del estado de cada proceso en cada tick. Encaja con el material didáctico de la asignatura.
* **Negativas:** Con muchos procesos o muchos ticks la matriz puede ser ancha; se resuelve con scroll horizontal.

---

## 11-06-2026 - Componentes separados conectados por React Context

### 1. Contexto y Problema
El profesor indicó que el componente monolítico (`<Simulator>`) no permite intercalar texto explicativo entre las partes visuales. En apuntes didácticos se quiere poner la tabla de procesos, luego un párrafo, luego el Gantt, luego más texto y finalmente las métricas.

### 2. Decisión Tomada
Se sustituye el `<Simulator>` monolítico por un `<SimulationProvider>` (contexto React) y cuatro componentes visuales independientes (`ProcessTable`, `GanttChart`, `PlaybackControls`, `MetricsTable`). Todos comparten datos a través del contexto. Se soportan dos layouts: todo junto (sin children, layout por defecto) o separados con texto entre ellos (pasando children).

### 3. Consecuencias
* **Positivas:** Flexibilidad de layout; los componentes se pueden colocar en cualquier orden con contenido entre ellos.
* **Negativas:** En Astro, todos los componentes deben estar dentro de la misma isla (`client:only="react"`) para compartir el contexto.

---

## 12-06-2026 - Exclusión de types/ y style/ del cubrimiento de código

### 1. Contexto y Problema
Los archivos de `src/core/types/` (interfaces TypeScript) y `src/react/style/` (CSS Modules) aparecían al 0% en el reporte de cobertura, bajando la media global y haciendo fallar el umbral de branches. No contienen lógica ejecutable.

### 2. Decisión Tomada
Se añadió `exclude: ['src/core/types/**', 'src/react/style/**']` a la configuración de coverage en `vite.config.ts`.

### 3. Consecuencias
* **Positivas:** La cobertura refleja solo código ejecutable real.

---

## 14-06-2026 - Visualización del GanttChart: layout y leyenda como matriz

### 1. Contexto y Problema
El GanttChart necesitaba un layout claro para uso didáctico: mostrar el mensaje del evento actual, la matriz sin texto en las celdas (solo colores), y una leyenda que explique tanto los procesos como los estados.

### 2. Decisión Tomada
El GanttChart se compone de tres bloques verticales: mensaje del evento arriba, matriz de celdas (solo color, sin texto como "CPU" o "W") en medio, y leyenda abajo. La leyenda es una **matriz** (no una lista): filas = procesos (vertical, con su color asignado), columnas = estados (Inactivo, En espera, En CPU). Cada celda de la leyenda muestra el color de esa combinación proceso/estado.

### 3. Consecuencias
* **Positivas:** La leyenda-matriz es compacta y autoexplicativa: el estudiante ve de un vistazo qué color corresponde a qué proceso en qué estado.
* **Negativas:** Ninguna relevante.