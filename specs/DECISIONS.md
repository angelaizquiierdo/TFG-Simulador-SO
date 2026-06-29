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

---

## 28-06-2026 - Anotación de nivel/cola por celda en el Gantt (MLFQ) vía `levelSnapshot`

### 1. Contexto y Problema
En algoritmos multinivel (MLFQ) la visualización por colores no comunica en qué **cola/nivel** está cada proceso en cada tick, y los mensajes genéricos del motor ("A entra en CPU") eran pobres comparados con la mecánica real ("A entra en la CPU desde la cola 0, quantum = 2"). Se quería mostrar el número de cola en la propia celda del Gantt y enriquecer el mensaje, **sin que el motor aprenda qué es un "nivel"** (concepto interno del algoritmo) ni romper la arquitectura genérica.

### 2. Decisión Tomada
Se añade un método **opcional** al contrato `IAlgorithm`: `levelSnapshot?(): Readonly<Record<string, number>>` (pid → nivel). El motor, al registrar cada `HistoryEvent`, copia ese snapshot tal cual en un campo **opcional** `HistoryEvent.levels?` (spread condicional para respetar `exactOptionalPropertyTypes`). Solo MLFQ lo implementa; los demás algoritmos no lo emiten y el campo no aparece. El `GanttChart` pinta el número de cola en pequeño en la parte superior de las celdas activas. El mensaje de `dispatch` de MLFQ se enriquece con cola y quantum. Se actualizó `specs/TECHNICAL.md` (contrato `IAlgorithm` y `HistoryEvent`).

### 3. Consecuencias
* **Positivas:** El motor sigue siendo genérico: solo pide un snapshot numérico opcional, no conoce el concepto de nivel. El tipado fuerte se mantiene (campo tipado, no `any`/`unknown`). MLFQ gana visualización y mensajes ricos sin tocar el bucle.
* **Negativas:** `HistoryEvent` acumula otro campo opcional (`inIO`, `waitingIO`, `levels`); a futuro, si proliferan, habría que valorar un mapa genérico de anotaciones a costa de tipado.

---

## 28-06-2026 - Refactor del bucle de preempción: helper `switchTo`

### 1. Contexto y Problema
El bucle del motor (`simulate.ts`) había crecido a 5 modos de preempción. Tres ramas (`on-better`, `io-return`, `on-quantum-and-better` —tanto en llegadas como en priority-boost) repetían casi literalmente el mismo patrón: emitir `preempted`, reencolar el proceso actual, despachar el seleccionado, (opcionalmente) renovar el quantum y construir el mensaje `"salida. A continuación, entrada"`. Esta duplicación era el principal riesgo de escalabilidad: cada algoritmo nuevo con un matiz de preempción tentaba con copiar otra rama de ~15 líneas.

### 2. Decisión Tomada
Se extrae una función local `switchTo(currentId, selected, exitMsg, setSlice)` dentro de `_executeSimulationLoop`, que cierra sobre el estado mutable del bucle (`onCPU`, `ready`, `ticksInSlice`, `currentSlice`, `prevTickMessage`) y centraliza el patrón. Cada rama pasa de ~15 líneas a 1–2: resuelve su mensaje de salida específico (expropiación normal o `priority boost`) y delega el cambio de CPU. El comportamiento es idéntico (277 tests en verde, sin cambios en tests). No se tocó la rama de despacho desde CPU inactiva (estructuralmente distinta: no hay proceso que reencolar).

### 3. Consecuencias
* **Positivas:** Se elimina la duplicación; añadir un modo de preempción nuevo ya no implica copiar el patrón completo. El bucle queda más legible y el punto único de cambio de CPU facilita futuras invariantes (logging, validación).
* **Negativas:** `switchTo` muta variables del closure exterior (efecto lateral implícito), patrón menos puro que pasar/retornar estado explícito; se asume a cambio de no enhebrar 5 variables por parámetro.

---

## 28-06-2026 - Modularización del motor: `simulate.ts` como fachada (Fase R1)

### 1. Contexto y Problema
`simulate.ts` había crecido a ~620 líneas mezclando tres responsabilidades: (a) la mecánica del bucle por ticks, (b) la validación de entrada y (c) las derivaciones puras (`deriveIntervals`, `deriveMetrics`). Esto lo hacía difícil de leer y de testear por partes, y era el techo que ya se había identificado: el motor "sabe demasiado" y todo vive en un solo archivo. Se decide la **Fase R1** de un refactor mayor: separar módulos **sin cambiar la lógica** (el rediseño de la política de preempción por *triggers* declarativos —Fase R2-R4— se difiere hasta que aparezca un algoritmo que lo justifique, por el principio de no anticipar).

### 2. Decisión Tomada
Se parte `simulate.ts` en módulos con una sola responsabilidad cada uno, manteniéndolo como **fachada pública**:
- `engine/loop.ts` — `executeSimulationLoop` (bucle por ticks) + helpers privados de selección (`resolveMsg`, `naturalCompare`, `buildReadyList`, `switchTo`) y el tipo `LoopState`.
- `engine/validate.ts` — `validateProcesses`.
- `derive/intervals.ts` — `deriveIntervals`.
- `derive/metrics.ts` — `deriveMetrics`.
- `simulate.ts` — solo `run`/`runFrom` (orquestación) + `RunConfig`, y **reexporta** `deriveIntervals`/`deriveMetrics` para que `src/index.ts`, la API pública y todos los tests sigan importando desde `simulate.ts` sin cambios.

La función privada `_executeSimulationLoop` se renombró a `executeSimulationLoop` (deja de llevar guion bajo: ya no es privada del archivo, sino exportada del módulo `engine/`). Cero cambios de comportamiento: los 277 tests pasan sin tocarse, typecheck y lint limpios. Se actualizaron `CLAUDE.md` (estructura canónica + regla de "no modificar el motor"), `TECHNICAL.md` (estructura + sección Motor + frontera ESLint) y `PLAN.md` (andamiaje, Fase 3, T-09, T-19). `SPECv-02.md` no se tocó: es un documento de comportamiento sin rutas a internos del motor; sus afirmaciones siguen siendo válidas.

### 3. Consecuencias
* **Positivas:** `simulate.ts` baja de ~620 a ~110 líneas y expresa solo la orquestación. Cada pieza (bucle, validación, derivaciones) es testeable de forma aislada. La API pública y la frontera ESLint (`src/core/**`) se mantienen intactas. Sienta la base para la Fase R2 (triggers declarativos) sin volver a tocar la estructura.
* **Negativas:** Más archivos y un salto de importación extra (`simulate → engine/loop`). El refactor de la *política* de preempción (el `if` por modo) sigue pendiente: R1 resuelve el tamaño del archivo, no el acoplamiento del motor a los modos de planificación.

---

## 28-06-2026 - Por qué migrar de `PreemptionMode` (enum) a `triggers` declarativos (inicio Fase R2)

### 1. Contexto y Problema
Tras R1, `simulate.ts` ya no está sobrecargado, pero el **acoplamiento de fondo persiste**: el motor (`engine/loop.ts`) decide *cuándo* reevaluar `select()` y *cuándo* expropiar mediante un `if/else if` sobre `algo.preemptionMode`, un **enum cerrado** de 5 valores. El problema es conceptual: los valores del enum no son modos atómicos, sino **combinaciones de disparadores**:

| `preemptionMode` | Equivale al conjunto de disparadores |
|---|---|
| `none` | `{}` |
| `on-better` | `{ on-tick }` |
| `on-quantum` | `{ on-quantum }` |
| `io-return` | `{ on-quantum, on-io-return }` |
| `on-quantum-and-better` | `{ on-quantum, on-arrival, on-io-return, on-boost }` |

Mientras siga siendo un enum, cada algoritmo nuevo con una mezcla distinta (p. ej. `quantum + on-tick`) obliga a **inventar un 6.º valor de enum y una 6.ª rama en el motor**. Ese es el techo identificado: el motor "sabe demasiado" de los modos concretos en vez de reaccionar a disparadores genéricos.

### 2. Decisión Tomada
Sustituir `PreemptionMode` por un conjunto declarativo `triggers: ReadonlySet<PreemptionTrigger>` que cada algoritmo expone. El motor dejará de ramificar por modo: en cada punto de decisión preguntará "¿alguno de los disparadores activos este tick está en `algo.triggers`?" y ejecutará **una sola** rutina genérica de reselección. Añadir un algoritmo con una combinación nueva pasará a ser **declarar su `Set`, sin tocar el motor**.

La migración se hace **escalonada** (R2 → R3 → R4) precisamente porque toca el contrato `IAlgorithm` y, por tanto, los tests:
- **R2 (esta fase):** introducir el tipo `PreemptionTrigger`, un mapa temporal `triggersFor(preemptionMode)` y el campo `triggers` **opcional** en el contrato, declarado en los 9 algoritmos. El motor **sigue usando el enum**: cero cambios de comportamiento. Se añade una prueba de consistencia que garantiza que cada `algo.triggers` coincide con `triggersFor(algo.preemptionMode)` — la red de seguridad para R3.
- **R3:** el motor consume `triggers` en lugar de `preemptionMode`. Comportamiento idéntico; los tests del motor existentes son la red.
- **R4:** retirar `preemptionMode` y el mapa temporal `triggersFor`. Aquí cambian los ~8 tests que afirman `algo.preemptionMode` (pasan a afirmar `algo.triggers`) y las clases inline de `contracts.test.ts`.

El campo se introduce **opcional** en R2 porque las clases minimal de `contracts.test.ts` (`MinimalFCFS`, `RichMessageAlgo`, `NullMessageAlgo`) implementan `IAlgorithm` declarando solo `preemptionMode`; un campo obligatorio rompería su typecheck antes de tiempo.

### 3. Consecuencias
* **Positivas:** Elimina el techo de escalabilidad del motor: el `if` por modo nunca crecerá a 7 ramas. Mantiene `select()`/`onEvent()` puros. La migración escalonada mantiene los 277 tests verdes en cada subfase y aísla el cambio de tests al final (R4), de forma controlada.
* **Negativas:** Durante R2-R3 coexisten **dos fuentes de verdad** (`preemptionMode` y `triggers`), sincronizadas por la prueba de consistencia; es deuda transitoria que R4 salda. Es un cambio de contrato que se justifica por el coste evitado en cada algoritmo futuro, no por una necesidad inmediata (hoy hay 5 modos, no 7).

### 4. Estado de la migración
- **R2.1** ✓ — tipo `PreemptionTrigger` + mapa `triggersFor()` en `types/algorithm.ts` + test del mapa.
- **R2.2** ✓ — campo `triggers?` opcional en `IAlgorithm`, declarado en los 9 algoritmos + prueba de consistencia (`contracts.test.ts`).
- **R2.3** ✓ — cierre documental: `TECHNICAL.md` (contrato, tabla de campos, § Migración a disparadores), `PLAN.md` (T-04) y la guía de desarrollador `03-crear-nuevo-algoritmo.mdx`.
- **R3** ✓ — `engine/loop.ts` consume `triggers` (`algo.triggers ?? triggersFor(algo.preemptionMode)`). Las tres ramas preemptivas de la decisión de reparto se colapsaron en una rutina genérica dirigida por disparadores (`on-tick` / `on-arrival` / `on-io-return` / `on-boost`); la expiración de quantum y la reevaluación de fin de tick pasan a `triggers.has('on-quantum')` / `triggers.has('on-tick')`. **Cero cambios de comportamiento: 294 tests verdes sin tocar ninguno.**
  - *Matiz preservado:* el slice en el dispatch desde CPU inactiva solo se fija si `triggers.has('on-quantum')` **y** existe fuente de quantum (`quantumFor` o `config.quantum`). En `io-return` (VRR) el quantum es opcional; sin esa guarda, un algoritmo `io-return` sin quantum (p. ej. fixtures de test) iniciaría una expiración espuria. La guarda es genérica (no menciona el modo).
- **R4** ✓ — retirados `preemptionMode` (campo y tipo `PreemptionMode`) y `triggersFor`. `triggers` es ahora **obligatorio** en `IAlgorithm` y única fuente de verdad. Los 9 algoritmos declaran solo `triggers`; el motor lee `algo.triggers` directamente. Cambios de test concentrados aquí: ~8 aserciones `algo.preemptionMode` → `algo.triggers`, fixtures inline de `contracts.test.ts`/`simulate.test.ts` migradas a `triggers`, y eliminados el test de `triggersFor` y la prueba de consistencia (ya sin objeto). **277 tests verdes**, typecheck y lint limpios. Docs finalizadas (`TECHNICAL.md`, `PLAN.md`, guía `03-crear-nuevo-algoritmo.mdx`). **Migración completa.**

---

## 29-06-2026 - Rediseño visual del GanttChart como tabla legible

### 1. Contexto y Problema
La matriz original era una cuadrícula de cubos de color sin texto. Para uso didáctico costaba leer de un vistazo qué hacía cada proceso, distinguir el estado de E/S del de espera, y orientarse en simulaciones largas (la tabla se desbordaba dentro del panel de Starlight). Se decidió rediseñar la presentación **sin tocar la lógica del motor** ni los contratos.

### 2. Decisión Tomada
El `GanttChart` se presenta como una **tabla**:
- **Cabecera de ticks** (`.rowHeader`) y **columna de nombres** (`.label`) en `--scheduler-surface-elevated`, distintas del cuerpo; bordes de rejilla con `--scheduler-border`.
- **Etiquetas dentro de la celda:** «CPU» en la celda en CPU (texto blanco con animación de pulso) y «E/S» en la celda en servicio; el nivel MLFQ como `L{n}` en un badge.
- **Estados de E/S** en **color de aviso** (`--scheduler-danger`, rojo): rayado diagonal en servicio, punteado en cola. CPU inactiva en superficie elevada.
- **Contención de tamaño:** `.matrix` con `overflow-x: auto` / `overflow-y: hidden` (scroll **horizontal** de filas enteras), borde redondeado y `min-width: 0` para respetar el ancho del content-panel de Starlight (`max-width: 100%`).
- **Tipografía monoespaciada** y efecto `hover` en celdas; **iconos SVG nativos** (`PlusIcon`, `TrashIcon`) en el `ProcessForm`.

Se actualizaron `BEHAVIOUSv-02.md` (§ Render — GanttChart: etiquetas de celda, colores de E/S, etiquetas de leyenda), `PLAN.md` (T-41) y `TECHNICAL.md` (Fase 9). Los tests de `GanttChart.test.tsx` se ajustaron al nuevo contrato (la celda en CPU muestra «CPU»; nuevas etiquetas de leyenda).

### 3. Consecuencias
* **Positivas:** Mucho más legible y didáctico; el estado de E/S es inconfundible; la tabla nunca desborda el simulador. La lógica del núcleo y los contratos quedan intactos (solo cambió `src/react/` y `tokens.css`).
* **Negativas:** Los estados de E/S dejan de usar el color del proceso (usan rojo de aviso), así que en E/S no se distingue *qué* proceso por color sino por fila. Las etiquetas de celda añaden texto que en celdas muy pequeñas podría competir con el color (mitigado con posición absoluta y tamaño reducido).