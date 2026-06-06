# Plan de Implementación — CPUSchedulerSimulator v01

> Hoja de ruta secuencial. Cada tarea es atómica: tiene un resultado verificable y sus
> tests pasan antes de continuar con la siguiente.
>
> Fuentes: `SPECv-01.md` · `BEHAVIOURS-v01.md` · `TECHNICAL.md` · Ubicación: `specs/PLAN.md`
>
> Identificadores del código en inglés; prosa en español.

---

## Cómo se ejecuta este plan

- Tarea por tarea, en orden. Una tarea = un cambio pequeño y autocontenido.
- Al terminar cada tarea, antes de pasar a la siguiente:
  1. `npm run lint`, `npm run typecheck` y `npm test` deben pasar.
  2. Si la tarea añade funcionalidad o un algoritmo, se actualiza su documentación en `docs/` en el mismo paso.
- No se avanza si la tarea actual no pasa su validación.
- Las fronteras de arquitectura las fuerza ESLint (`core` no importa React/DOM).
- "Cierra" indica los criterios de `BEHAVIOURS-v01.md` verificados con un test.

---

## Fase 0 — Andamiaje

### T-00 · Estructura y configuración del proyecto principal (el módulo)

Crear la estructura: `src/core/{types, algorithms/(non-preemptive, preemptive)}`,
`src/react`, `src/style`, `tests/core`, `tests/react`.

`tsconfig.json` con `strict: true` más `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,`noImplicitReturns`. **No extiende el preset de Astro** (solo `docs/` lo hace).

ESLint con `typescript-eslint` (`strictTypeChecked` + `stylisticTypeChecked`), `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, y las **fronteras**:
- `src/core/**` no importa React, el DOM ni `src/react/**`.
- `src/core/algorithms/**` solo importa el contrato (`types/algorithm.ts`).
- `src/react/**` puede importar `src/core`, nunca al revés.

Build de librería (Vite/tsup) y Vitest con entornos separados (`tests/core`→node,`tests/react`→jsdom). Scripts: `build`, `typecheck`, `lint`, `test`.

**Verificación:** `typecheck` y `lint` sin errores en vacío; un import prohibido de prueba (React desde `core`) hace fallar el lint.

---

### T-01 · Andamiaje del subproyecto `docs/`

`docs/` con su propio `package.json` (depende del módulo). Astro + Starlight con `tsconfig` que extiende `astro/tsconfigs/strictest`; `eslint-plugin-astro`. Páginas vacías:

```
docs/src/content/docs/cpu-scheduler/
  non-preemptive/  (fcfs.mdx, sjf.mdx, ljf.mdx, prio-n.mdx)
  preemptive/      (round-robin.mdx, srtf.mdx, prio-p.mdx)
```

**Verificación:** `astro check` y `astro build` pasan con páginas vacías.

---

## Fase 1 — Tipos y contratos (`src/core/types/`)

Solo definiciones de tipos. Nada ejecutable.

### T-02 · `Process` y `ReadyProcess`

`process.ts`: `Process` con `id`, `arrival_time` (≥ 0), `burst_time` (> 0), `priority?`.
`algorithm.ts`: `ReadyProcess` (vista de solo lectura): `id`, `arrival_time`, `burst_time`, `remaining`, `priority?`, todos `readonly`.


**Verificación:** compilan en modo estricto; `ReadyProcess` ≠ `Process`.
 

### T-03 · `PreemptionMode` e `IAlgorithm`

`algorithm.ts`: `PreemptionMode = 'none' | 'on-better' | 'on-quantum'`; `IAlgorithm` con `name`, `preemptionMode`, `requires: { priority?; quantum? }`, `select(ready: readonly ReadyProcess[]): ReadyProcess`.

**Verificación:** una clase mínima implementa `IAlgorithm` sin errores; el linter rechaza importar React/DOM desde este archivo.


### T-04 · `History`

`history.ts`: `HistoryEvent` (`tick`, `onCPU`, `ready`, `pending`, `completed`, `message`, todos `readonly`), `History = readonly HistoryEvent[]`, `Interval` (`pid: string | null`, `start`, `end`).

**Verificación:** `History` indexable con `noUncheckedIndexedAccess` (devuelve `HistoryEvent | undefined`).

### T-05 · `SimulationResult` y métricas

`simulation-result.ts`: `ProcessMetrics` (`id`, `completion`, `turnaround`, `waiting`, `response`), `AggregateMetrics` (`avgWaiting`, `avgTurnaround`, `cpuUtilization`, `throughput`), `SimulationResult` = `{ history; intervals: Interval[]; metrics }`.

**Nota:** `intervals` y `metrics` se **derivan** del `history` con funciones puras.

---

## Fase 2 — Registry (`src/core/registry.ts`)

### T-06 · Registro y búsqueda

`register(algo: IAlgorithm): void` y `get(name: string): IAlgorithm` (error descriptivo si no existe). Singleton.

**Verificación:** test — registrar un algoritmo mínimo y recuperarlo por `name`; nombre inexistente lanza error. Cierra la parte de registro de **«Contrato de algoritmo»**.

---

## Fase 3 — Motor (`src/core/simulate.ts`)

El motor es el único que escribe el `history`. Prohibido `Math.random` y `Date.now`.

### T-07 · Bucle tick a tick y CPU inactiva

`run(processes, config): SimulationResult`. Incorporar llegadas por tick, detectar CPU inactiva, escribir un `HistoryEvent` por tick con su `message`.

**Test — `BEHAVIOURS § CPU inactiva`:** P1(arrival=2, burst=2) con FCFS → `onCPU` null en ticks 0 y 1; intervals con hueco `{ pid: null, start: 0, end: 2 }` y P1`[2–4]`.

### T-08 · Desempate global

Ordenar `ready` antes de `select()`: criterio del algoritmo → menor `arrival_time` → menor `id`. El desempate por `id` debe ser por orden de inserción o numérico, no lexicográfico ingenuo (evita que `P10` se ordene antes que `P2`).

**Test:** empate en `arrival_time` con `id` distintos → resultado estable; dos ejecuciones dan historiales idénticos. Cierra **«Determinismo»**.

### T-09 · Modo `'none'` (no expropiativo)

El motor llama a `select()` solo cuando la CPU queda libre. Validar con un FCFS stub.

**Test — `BEHAVIOURS § Simular — FCFS`:** P1(0,3), P2(2,2) → P1`[0–3]`, P2`[3–5]`.

### T-10 · Modo `'on-better'` (expropiativo por mejor proceso)

El motor reevalúa cada tick; si `select()` devuelve otro proceso, expropia.

**Test — `BEHAVIOURS § Simular — SRTF`:** P1(0,5), P2(1,2) → P1`[0–1]`, P2`[1–3]`, P1`[3–7]`.

### T-11 · Modo `'on-quantum'` (Round Robin)

Expropia al agotar el `quantum` y reencola el proceso. **Coincidencia en un tick:** el que
llega entra en `ready` antes que el reencolado.

**Test — `BEHAVIOURS § Simular — Round Robin`:** P1(0,4), P2(0,3), quantum=2 → P1`[0–2]`,
P2`[2–4]`, P1`[4–6]`, P2`[6–7]`.

### T-12 · Derivación de `intervals` y `metrics` (funciones puras)

`deriveIntervals(history)` (colapsa tramos consecutivos del mismo `pid`) y
`deriveMetrics(history, processes)` (`completion`, `turnaround`, `waiting`, `response` por
proceso; agregadas). `run()` las llama al final.

**Test — métricas de `BEHAVIOURS § FCFS`:** `avgWaiting` = 0.5, `avgTurnaround` = 3.

### T-13 · Coherencia del `history` (`completed` y `message`)

En cada tick T, `completed` contiene exactamente los procesos finalizados en T o antes. Los
`message` describen el evento.

**Test — `BEHAVIOURS § Coherencia de métricas y estado`:** `completed` crece
monotónicamente y es consistente con los ticks de finalización.

### T-14 · Casos límite

- Sin procesos: `run()` devuelve `history` vacío, sin error.
- `burst_time = 0`: `run()` lanza error con mensaje `"La ráfaga debe ser mayor que 0"`.

**Tests — `BEHAVIOURS § Conjunto vacío` y `§ Configuración inválida`.**

### T-15 · Aislamiento de dependencias (Node)

Test que importa `run()` desde un script Node (`tests/core`) y ejecuta FCFS, sin React, DOM
ni imports de `src/react/`.

**Test — `BEHAVIOURS § Simulador independiente de la vista`.**

---

## Fase 4 — Player (`src/core/player.ts`)

### T-16 · Cursor sobre el `history`

`Player` con `tick`, `stepForward()` (no supera el último), `stepBackward()` (no baja de 0),
`goTo(n)` (no recalcula), `atStart`, `atEnd`. Puro: sin `requestAnimationFrame`/`setTimeout`/
`deltaTime`.

**Tests — `BEHAVIOURS § Navegación manual`:** tick 3 → adelante → 4; tick 3 → atrás → 2;
tick 0 → atrás → 0; último → adelante → último; `goTo(N)` → N sin recalcular.

---

## Fase 5 — Algoritmos (`src/core/algorithms/`)

 Cada algoritmo implementa `IAlgorithm` en su clase y no accede a los internos del motor. Los 7 son independientes entre sí.

| ID | Archivo | `preemptionMode` | `select` | Test (`BEHAVIOURS`) |
|----|---------|------------------|----------|---------------------|
| T-17 | `non-preemptive/fcfs.ts` | `'none'` | primer elemento (FIFO) | FCFS → P1`[0–3]`,P2`[3–5]`; `avgWaiting` 0.5; `avgTurnaround` 3 |
| T-18 | `non-preemptive/sjf.ts` | `'none'` | menor `remaining` | SJF: P1(0,4),P2(1,2),P3(2,1) → P1`[0–4]`,P3`[4–5]`,P2`[5–7]` |
| T-19 | `non-preemptive/ljf.ts` | `'none'` | mayor `burst_time` | LJF: P1(0,2),P2(0,4),P3(0,3) → P2`[0–4]`,P3`[4–7]`,P1`[7–9]` |
| T-20 | `non-preemptive/priority-np.ts` | `'none'` (`requires.priority`) | menor `priority` | Prio-NP: P1(0,3,2),P2(0,1,1) → P2`[0–1]`,P1`[1–4]` |
| T-21 | `preemptive/srtf.ts` | `'on-better'` | menor `remaining` | SRTF: P1(0,5),P2(1,2) → P1`[0–1]`,P2`[1–3]`,P1`[3–7]` |
| T-22 | `preemptive/priority-p.ts` | `'on-better'` (`requires.priority`) | menor `priority` | Prio-P: P1(0,4,3),P2(2,2,1) → P1`[0–2]`,P2`[2–4]`,P1`[4–6]` |
| T-23 | `preemptive/round-robin.ts` | `'on-quantum'` (`requires.quantum`) | FIFO | RR q=2: P1(0,4),P2(0,3) → P1`[0–2]`,P2`[2–4]`,P1`[4–6]`,P2`[6–7]` |

### T-24 · Contrato de extensibilidad (algoritmo externo)

Crear un algoritmo de prueba mínimo fuera de `src/core/algorithms/`, registrarlo por su `name` y ejecutar `run()` sin tocar el motor ni los algoritmos existentes.

**Test — `BEHAVIOURS § Contrato de algoritmo`:** el motor lo ejecuta y devuelve un `SimulationResult` válido.

---

## Fase 6 — Componente React (`src/react/`)

### T-25 · `<Simulator>` — integración con el core

Props: `{ algorithm, processes, params?, metrics? }`. Al montar: `run()`, instancia un
`Player`, gestiona el índice y reparte el `HistoryEvent` actual a los subcomponentes.
- `processes` vacío → estado vacío sin error.
- `burst_time = 0` → muestra `"La ráfaga debe ser mayor que 0"` y no simula.

**Tests — `BEHAVIOURS § Conjunto vacío`, `§ Configuración inválida`, `§ Escenario de ejemplo`.**

### T-26 · `<GanttChart>`

Renderiza `intervals` (huecos `pid:null` distinguibles).
**Test:** intervals del ejemplo FCFS → aparecen P1`[0–3]` y P2`[3–5]`.

### T-27 · `<PlaybackControls>`

Reproducir/pausar adelante y atrás, paso ±1, barra de salto. `deltaTime` y `requestAnimationFrame` viven **solo aquí**.

**Tests — `BEHAVIOURS § Reproducción automática` y `§ Navegación manual`** (con *fake
timers*): desde 0 → avanza al final y se detiene; desde el final → baja a 0; límites; salto.

### T-28 · `<MetricsTable>`

`metrics` por proceso y agregadas, visibles al completar el recorrido. Respeta la prop `metrics` (filtra columnas; vacía → ninguna).

**Test — `BEHAVIOURS § Coherencia de métricas y estado`:** visibles solo al finalizar.

### T-29 · Campos declarados por `requires`

`<Simulator>` lee `requires` del algoritmo activo: oculta `priority` si `requires.priority` es falso ; muestra `quantum` (entero > 0) si `requires.quantum`.

**Tests — `BEHAVIOURS § Página de algoritmo y campos declarados`:** FCFS no muestra
`priority`; Prioridad la muestra; RR muestra `quantum`.

---

## Fase 7 — Documentación (`docs/`)

### T-30 · Guías para desarrolladores

Tres guías: **cómo usar** el componente, **cómo configurarlo** (`processes`, `algorithm`, `quantum`, `metrics`) y **cómo crear un algoritmo** (implementar `IAlgorithm` y registrarlo).

**Hecha cuando:** las tres guías existen y son correctas; `astro check` pasa.

### T-31 · Página de demo FCFS

`non-preemptive/fcfs.mdx`: descripción + isla `<Simulator algorithm="fcfs" processes={[P1(0,3), P2(2,2)]} client:visible>`.

**Tests — `BEHAVIOURS § Escenario de ejemplo por defecto`:** al cargar aparece el escenario
precargado y simulable; al recargar vuelve al mismo (sin persistencia).

### T-32 · Páginas SJF, LJF y Prioridad no expropiativa

Una `.mdx` por algoritmo con su escenario de ejemplo de `BEHAVIOURS`.

### T-33 · Páginas SRTF, Round Robin y Prioridad expropiativa

Una `.mdx` por algoritmo con su escenario de ejemplo de `BEHAVIOURS`.

---

## Fase 8 — Verificación final

### T-34 · Cobertura de `BEHAVIOURS-v01.md`

Cada criterio tiene al menos un test que pasa. Mantener alta cobertura en `src/core/` (la cobertura es una guía, no un umbral del 100 %).

### T-35 · Typecheck y lint limpios

`typecheck` y `lint` sin warnings ni errores en el proyecto principal; `astro check` sin errores en `docs/`.

### T-36 · Build de producción

`npm run build` genera la librería; `npm run docs:build` genera el sitio. En `docs:preview`, verificar que cada página carga su escenario, navega tick a tick y muestra las métricas al final.

---

## Dependencias entre fases

```
Fase 0 (T-00, T-01)
  └─► Fase 1 (T-02 … T-05)
        └─► Fase 2 (T-06)
              └─► Fase 3 (T-07 … T-15)
                    ├─► Fase 4 (T-16)
                    │     └─► Fase 6 (T-25 … T-29)
                    │           └─► Fase 7 (T-30 … T-33)
                    │                 └─► Fase 8 (T-34 … T-36)
                    └─► Fase 5 (T-17 … T-24)  ← paralelos entre sí
```

---

## Trazabilidad BEHAVIOURS ↔ tareas

| Criterio `BEHAVIOURS-v01.md`              | Tarea(s)        |
|-------------------------------------------|-----------------|
| Contrato de algoritmo (extensibilidad)    | T-06, T-24      |
| Simulador independiente de la vista       | T-15            |
| Página de algoritmo y campos declarados   | T-29            |
| Configuración inválida (burst = 0)        | T-14, T-25      |
| Simular — FCFS                            | T-09, T-17      |
| Simular — SJF                             | T-18            |
| Simular — LJF                             | T-19            |
| Simular — Prioridad (no expropiativa)     | T-20            |
| Simular — SRTF                            | T-10, T-21      |
| Simular — Prioridad (expropiativa)        | T-22            |
| Simular — Round Robin                     | T-11, T-23      |
| CPU inactiva                              | T-07            |
| Determinismo                              | T-08            |
| Reproducción automática                   | T-27            |
| Navegación manual                         | T-16, T-27      |
| Coherencia de métricas y estado           | T-13, T-28      |
| Escenario de ejemplo por defecto          | T-25, T-31      |
| Conjunto vacío                            | T-14, T-25      |

Documentación para desarrolladores → T-30.

---

## Hito de cierre de v1

v1 está terminada cuando **T-36** pasa: el módulo se construye como librería, los siete algoritmos verificados contra sus diagramas de Gantt, el componente con navegación y métricas, y `docs/` con las guías y un ejemplo por algoritmo. Cada criterio de `BEHAVIOURS-v01.md` tiene su test en verde.