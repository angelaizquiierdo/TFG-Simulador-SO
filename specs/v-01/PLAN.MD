# Plan de Implementación — CPUSchedulerSimulator v01

> Hoja de ruta secuencial. Cada tarea es atómica: tiene un resultado verificable y sus
> tests pasan antes de continuar con la siguiente.
>
> Fuentes: `SPECv-01.md` · `BEHAVIOURS-v01.md` · `TECHNICAL.md` · Ubicación: `specs/v-01/PLAN.md`
>
> Identificadores del código en inglés; prosa en español.

---

## Cómo se ejecuta este plan

- Tarea por tarea, en orden. Una tarea = un cambio pequeño y autocontenido.
- Al terminar cada tarea, antes de pasar a la siguiente:
  1. `npm run lint`, `npm run typecheck` y `npm test` deben pasar.
  2. Si la tarea añade funcionalidad o un algoritmo, se actualiza `docs/` en el mismo paso.
  3. **No hacer commit** hasta que la fase completa esté terminada.
- No se avanza si la tarea actual no pasa su validación.
- **Commit al finalizar cada fase** (no después de cada tarea). Mensaje breve:

| Fase | Mensaje de commit |
|------|-------------------|
| 0 — Andamiaje | `fase-0: andamiaje` |
| 1 — Tipos y contratos | `fase-1: tipos` |
| 2 — Registro | `fase-2: registry` |
| 3 — Motor | `fase-3: motor` |
| 4 — Player | `fase-4: player` |
| 5 — Algoritmos | `fase-5: algoritmos` |
| 6 — Componente React | `fase-6: componente` |
| 7 — Documentación | `fase-7: docs` |
| 8 — Verificación final | `fase-8: verificacion` |

- Las fronteras de arquitectura las fuerza ESLint (`core` no importa React/DOM).
- "Cierra" indica los criterios de `BEHAVIOURS-v01.md` verificados con un test.

---

## Fase 0 — Andamiaje

### T-00 · Inicializar el proyecto principal (el módulo)

```bash
npm init -y
mkdir -p src/core/types \
         src/core/algorithms/non-preemptive \
         src/core/algorithms/preemptive \
         src/react src/react/style tests/core tests/react

# dependencias del módulo (build + tests + lint + test:coverage)
npm install -D typescript vite @vitejs/plugin-react vite-plugin-dts \
  vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event \
  @testing-library/jest-dom eslint typescript-eslint \
  eslint-plugin-react-hooks eslint-plugin-jsx-a11y \
  react react-dom @types/react @types/react-dom
```

Luego crear y configurar:

- `package.json`: `name` (p. ej. `cpu-scheduler`), `type: "module"`, `exports` →
  `./dist/index.js`, `peerDependencies` de React, `"workspaces": ["docs"]`, y los
  scripts obligatorios:
  - `build` — vite build
  - `typecheck` — `tsc --noEmit`
  - `lint` — `eslint .`
  - `test` — **`vitest run --passWithNoTests`** (el `--passWithNoTests` es crítico: evita
    que Vitest falle en Fase 0 y Fase 1 cuando aún no hay archivos de test)
  - `test:coverage` — `vitest run --coverage`
  - `docs:dev` — `npm --workspace docs run dev`
  - `docs:build` — `npm --workspace docs run build`
- `tsconfig.json` con `strict: true` + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,`noImplicitReturns`. **No extiende el preset de Astro** (solo `docs/` lo hace).
- `vite.config.ts`: build de librería (entry `src/index.ts`, `external: ['react','react-dom']`), Vitest con `environmentMatchGlobs` (`tests/core`→node, `tests/react`→jsdom) y umbrales de cobertura:
  ```ts
  test: {
    environmentMatchGlobs: [
      ['tests/react/**', 'jsdom'],
      ['tests/core/**', 'node'],
    ],
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/react/**'],
      exclude: ['src/core/types/**', 'src/react/style/**'],
      thresholds: {
        lines: 90, functions: 90, statements: 90, branches: 80,
      },
    },
  }
  ```
- ESLint (`strictTypeChecked` + `stylisticTypeChecked`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`) con las **fronteras**: `src/core/**` no importa React/DOM ni `src/react/**`; `src/core/algorithms/**` solo importa `types/algorithm.ts`; `src/react/**` puede importar `src/core`, nunca al revés.

**Verificación:** `npm run typecheck` y `npm run lint` sin errores en vacío; `npm test` pasa sin tests (`--passWithNoTests`); un import prohibido de prueba (React desde `core`) hace fallar el lint.

---

### T-01 · Crear el subproyecto `docs/` (Astro + Starlight — solo la demo)

`docs/` es un **subproyecto independiente** que contiene únicamente el sitio de visualización y demostración. **No contiene simulador ni componente:** esos viven en `src/` a nivel raíz. `docs/` importa el módulo a través de un alias de Vite que apunta directamente a `../src/index.ts` durante el desarrollo — sin necesidad de hacer `npm run build` primero.

```bash

npm create astro@latest docs -- --template starlight

cd docs
npx astro add react
cd ..

npm install
```
Después, reemplazar el `docs/astro.config.mjs` generado por la plantilla con:

```js
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  integrations: [
    starlight({
      title: 'CPU Scheduler Simulator',
      sidebar: [
        {
          label: 'No expropiativos',
          items: [
            { label: 'FCFS',               link: '/cpu-scheduler/non-preemptive/fcfs' },
            { label: 'SJF',                link: '/cpu-scheduler/non-preemptive/sjf' },
            { label: 'LJF',                link: '/cpu-scheduler/non-preemptive/ljf' },
            { label: 'Prioridad (NP)',      link: '/cpu-scheduler/non-preemptive/prio-n' },
          ],
        },
        {
          label: 'Expropiativos',
          items: [
            { label: 'Round Robin',        link: '/cpu-scheduler/preemptive/round-robin' },
            { label: 'SRTF',               link: '/cpu-scheduler/preemptive/srtf' },
            { label: 'Prioridad (P)',       link: '/cpu-scheduler/preemptive/prio-p' },
          ],
        },
      ],
    }),
    react(),
  ],
  vite: {
    resolve: {
      alias: {
        'cpu-scheduler': resolve(__dirname, '../src/index.ts'),
      },
    },
  },
});
```

Con este alias, las páginas `.mdx` importan el componente así:

```mdx
import { SimulationProvider } from 'cpu-scheduler';

{/* Sin hijos: renderiza los cuatro componentes por defecto */}
<SimulationProvider
  algorithm="fcfs"
  processes={[...]}
  client:only="react"
/>
```

Crear la estructura de páginas vacías con ese frontmatter mínimo:

```
docs/src/content/docs/cpu-scheduler/
  non-preemptive/  (fcfs.mdx, sjf.mdx, ljf.mdx, prio-n.mdx)
  preemptive/      (round-robin.mdx, srtf.mdx, prio-p.mdx)
```

Confirmar que `docs/tsconfig.json` extiende `astro/tsconfigs/strictest` y añadir `eslint-plugin-astro`.

**Verificación:** `npm run docs:dev` arranca sin errores; `npm run docs:build` pasa con páginas vacías; el alias resuelve correctamente (`import from 'cpu-scheduler'` no da error de módulo no encontrado).

---

## Fase 1 — Tipos y contratos (`src/core/types/`)

> Solo definiciones de tipos. Nada ejecutable.

### T-02 · `Process` y `ReadyProcess`

`process.ts`: `Process` con `id`, `arrival_time` (≥ 0), `burst_time` (> 0), `priority?`. `algorithm.ts`: `ReadyProcess` (vista de solo lectura): `id`, `arrival_time`, `burst_time`, `remaining`, `priority?`, todos `readonly`.

**Verificación:** compilan en modo estricto; `ReadyProcess` ≠ `Process`.

### T-03 · `PreemptionMode` e `IAlgorithm`

`algorithm.ts`: `PreemptionMode = 'none' | 'on-better' | 'on-quantum'`; `IAlgorithm` con `name`, `preemptionMode`, `requires: { priority?; quantum? }`, `select(ready: readonly ReadyProcess[]): ReadyProcess`.

**Verificación:** `typecheck` confirma que una clase mínima implementa `IAlgorithm` sin errores. El linter rechaza importar React/DOM desde este archivo. Los tests de comportamiento de `select()` vienen de `BEHAVIOURS-v01.md` y se escriben en T-17–T-23.

### T-04 · `History`

`history.ts`: `HistoryEvent` (`tick`, `onCPU`, `ready`, `pending`, `completed`, `message`,
todos `readonly`), `History = readonly HistoryEvent[]`, `Interval` (`pid: string | null`,
`start`, `end`).

**Verificación:** `typecheck` confirma que `History` es indexable con `noUncheckedIndexedAccess` (devuelve `HistoryEvent | undefined`, obligando al guard).
Las invariantes de comportamiento del historial (`completed` crece monotónicamente, `onCPU` no aparece en `ready`, `start < end` en intervalos) las verifican los criterios de `BEHAVIOURS-v01.md` cuando el motor exista en T-07+.

### T-05 · `SimulationResult` y métricas

`simulation-result.ts`: `ProcessMetrics` (`id`, `completion`, `turnaround`, `waiting`, `response`), `AggregateMetrics` (`avgWaiting`, `avgTurnaround`, `cpuUtilization`, `throughput`), `SimulationResult` = `{ history; intervals: Interval[]; metrics }`.

**Nota:** `intervals` y `metrics` se **derivan** del `history` con funciones puras.

---

## Fase 2 — Registry (`src/core/registry.ts`)

### T-06 · Registro y búsqueda

`register(algo: IAlgorithm): void` y `get(name: string): IAlgorithm` (error descriptivo si no existe). Singleton.

**Verificación:** test — registrar un algoritmo mínimo y recuperarlo por `name`; nombre inexistente lanza error. Cierra la parte de registro de **«Contrato de algoritmo»** y **Registro de algoritmos (Motor interno)**.

---

## Fase 3 — Motor (`src/core/simulate.ts`)

> El motor es el único que escribe el `history`. Prohibido `Math.random` y `Date.now`.

### T-07 · Bucle tick a tick y CPU inactiva

`run(processes, config): SimulationResult`. Incorporar llegadas por tick, detectar CPU inactiva, escribir un `HistoryEvent` por tick con su `message`.

**Cierra:** `BEHAVIOURS § CPU inactiva` (ambos casos) — `tests/core/simulate.test.ts`

### T-08 · Desempate global

Ordenar `ready` antes de `select()`: criterio del algoritmo → menor `arrival_time` → menor`id`. El desempate por `id` debe ser por orden de inserción o numérico, no lexicográfico ingenuo (evita que `P10` se ordene antes que `P2`).

**Cierra:** `BEHAVIOURS § Determinismo` (todos los casos) — `tests/core/simulate.test.ts`

### T-09 · Modo `'none'` (no expropiativo)

El motor llama a `select()` solo cuando la CPU queda libre. Validar con un FCFS stub.

**Cierra:** `BEHAVIOURS § Simular — FCFS` (todos los casos) — `tests/core/simulate.test.ts`

### T-10 · Modo `'on-better'` (expropiativo por mejor proceso)

El motor reevalúa cada tick; si `select()` devuelve otro proceso, expropia.

**Cierra:** `BEHAVIOURS § Simular — SRTF` (todos los casos) — `tests/core/simulate.test.ts`

### T-11 · Modo `'on-quantum'` (Round Robin)

Expropia al agotar el `quantum` y reencola el proceso. **Coincidencia en un tick:** el que llega entra en `ready` antes que el reencolado.

**Cierra:** `BEHAVIOURS § Simular — Round Robin` (todos los casos) — `tests/core/simulate.test.ts`

### T-12 · Derivación de `intervals` y `metrics` (funciones puras)

`deriveIntervals(history)` (colapsa tramos consecutivos del mismo `pid`) y `deriveMetrics(history, processes)` (`completion`, `turnaround`, `waiting`, `response` por proceso; agregadas). `run()` las llama al final.

**Cierra:** métricas de `BEHAVIOURS § Simular — FCFS` — `tests/core/simulate.test.ts`

### T-13 · Coherencia del `history` (`completed` y `message`)

En cada tick T, `completed` contiene exactamente los procesos finalizados en T o antes. Los `message` describen el evento.


**Cierra:** `BEHAVIOURS § Coherencia de métricas y estado` (todos los casos) — `tests/core/simulate.test.ts`

### T-14 · Casos límite

- Sin procesos: `run()` devuelve `history` vacío, sin error.
- `burst_time = 0`: `run()` lanza error con mensaje `"La ráfaga debe ser mayor que 0"`.

**Cierra:** `BEHAVIOURS § Conjunto vacío`, `§ Configuración inválida` y `§ Seguridad y tolerancia a fallos (Motor interno)` — `tests/core/simulate.test.ts`

### T-15 · Aislamiento de dependencias (Node)

Test que importa `run()` desde un script Node (`tests/core`) y ejecuta FCFS, sin React, DOM ni imports de `src/react/`.


**Cierra:** `BEHAVIOURS § Simulador independiente de la vist` y `BEHAVIOUS § Estructura del resultado de simulación` — `tests/core/simulate.test.ts`

---

## Fase 4 — Player (`src/core/player.ts`)

### T-16 · Cursor sobre el `history`

`Player` con `tick`, `stepForward()` (no supera el último), `stepBackward()` (no baja de 0), `goTo(n)` (no recalcula), `atStart`, `atEnd`. Puro: sin `requestAnimationFrame`/`setTimeout`/ `deltaTime`.

**Tests — `BEHAVIOURS § Navegación manual`:** tick 3 → adelante → 4; tick 3 → atrás → 2; tick 0 → atrás → 0; último → adelante → último; `goTo(N)` → N sin recalcular.

---

## Fase 5 — Algoritmos (`src/core/algorithms/`)

> Cada algoritmo implementa `IAlgorithm` en su clase y no accede a los internos del motor.
> Los 7 son independientes entre sí.

| ID | Archivo | `preemptionMode` | `select` | Test 1 (BEHAVIOURS) |
|----|---------|------------------|----------|---------------------|
| T-17 | `non-preemptive/fcfs.ts` | `'none'` | primer elemento (FIFO) | `§ Simular — FCFS` — `tests/core/algorithms/non-preemptive/fcfs.test.ts` |
| T-18 | `non-preemptive/sjf.ts` | `'none'` | menor `remaining` | `§ Simular — SJF` — `tests/core/algorithms/non-preemptive/sjf.test.ts` |
| T-19 | `non-preemptive/ljf.ts` | `'none'` | mayor `burst_time` | `§ Simular — LJF` — `tests/core/algorithms/non-preemptive/ljf.test.ts` |
| T-20 | `non-preemptive/priority-np.ts` | `'none'` | menor `priority` | `§ Simular — Prioridad (NP)` — `tests/core/algorithms/non-preemptive/priority-np.test.ts` |
| T-21 | `preemptive/srtf.ts` | `'on-better'` | menor `remaining` | `§ Simular — SRTF` — `tests/core/algorithms/preemptive/srtf.test.ts` |
| T-22 | `preemptive/priority-p.ts` | `'on-better'` | menor `priority` | `§ Simular — Prioridad (P)` — `tests/core/algorithms/preemptive/priority-p.test.ts` |
| T-23 | `preemptive/round-robin.ts` | `'on-quantum'` | FIFO | `§ Simular — Round Robin` — `tests/core/algorithms/preemptive/round-robin.test.ts` |

### T-24 · Contrato de extensibilidad (algoritmo externo)

Crear un algoritmo de prueba mínimo fuera de `src/core/algorithms/`, registrarlo por su `name` y ejecutar `run()` sin tocar el motor ni los algoritmos existentes.

**Cierra:** `BEHAVIOURS § Contrato de algoritmo` (ambos casos) — `tests/core/algorithms/contracts.test.ts`

---

## Fase 6 — Componente React (`src/react/`)

> Los componentes se conectan mediante un React Context (uno por simulación).
> `SimulationProvider` es el único que llama al core; los visuales solo leen del contexto. 

> Cada componente visual crea su `.module.css` en `src/react/style/`

### T-25 · `SimulationContext` + `<SimulationProvider>`

Archivos: `SimulationContext.ts`, `SimulationProvider.tsx`, `style/SimulationProvider.module.css`.

`SimulationContext.ts`: crear el contexto y el hook `useSimulation()` (lanza error si se
usa fuera de un Provider).

`SimulationProvider.tsx`: recibe `{ algorithm, processes, params? }`. Al montar: llama a
`run()`, instancia un `Player`, expone por contexto el `SimulationResult`, el
`HistoryEvent` actual, el estado del `Player` y el error (si lo hay).

- `processes` vacío → estado vacío sin error.
- `burst_time = 0` → contexto con `error: "La ráfaga debe ser mayor que 0"`, sin resultado.

**Cierra:** `BEHAVIOURS § Conjunto vacío`, `§ Configuración inválida`, `§ Escenario de ejemplo` y `§ Renderizado — SimulationProvider` — `tests/react/SimulationProvider.test.tsx`

### T-26 · `<ProcessTable>`

Archivos: `ProcessTable.tsx`, `style/ProcessTable.module.css`.

Lee los procesos y el descriptor del algoritmo (`requires`) del contexto. Muestra la tabla de procesos. Oculta la columna `priority` si `requires.priority` es falso; muestra
`quantum` en la configuración si `requires.quantum`.

**Cierra:** `BEHAVIOURS § Página de algoritmo y campos declarados` y `§ Renderizado — ProcessTable` — `tests/react/ProcessTable.test.tsx`

### T-27 · `<GanttChart>`

Archivos: `GanttChart.tsx`, `style/GanttChart.module.css`.

Lee history y el tick actual del Player del contexto. Layout de arriba abajo:


1. **Mensaje del evento** — `HistoryEvent.message` del tick actual.
2. **Matriz** — filas: procesos, columnas: ticks (cabecera `0`, `1`, `2`…). Solo hasta el tick actual (sincronizado con PlaybackControls). Celdas **solo color, sin texto** (no poner "CPU", "W" ni etiquetas). Colores: en CPU = sólido, en espera = claro, no llegado/completado = gris muy claro (no transparente), inactividad = gris medio. Cabecera lateral de nombres de proceso con **fondo neutro visible** (no transparente). Paleta automática (mínimo 10 colores alto contraste).
3. Título **"Leyenda"** visible, seguido de la matriz de leyenda: filas = procesos (vertical, con su color), columnas = estados (Inactivo, En espera, En CPU).

**Cierra:** `BEHAVIOURS § Renderizado — GanttChart (matriz sincronizada)` (todos los casos) — `tests/react/GanttChart.test.tsx`

### T-28 · `<PlaybackControls>`

Archivos: `PlaybackControls.tsx`, `style/PlaybackControls.module.css`.

Lee/escribe el `Player` del contexto. Botones en orden: ⏮ ◀   ▶/⏸  ▶| ⏭. Barra de desplazamiento, indicador `Tick: N / Total`. Botones deshabilitados (opacidad reducida) cuando no aplican. `deltaTime` y `requestAnimationFrame` viven **solo aquí**.

Archivos: `PlaybackControls.tsx`, `style/PlaybackControls.module.css`.

**Cierra:** `BEHAVIOURS § Reproducción automática`, `§ Navegación manual` y `§ Renderizado — PlaybackControls` — `tests/react/PlaybackControls.test.tsx`

### T-29 · `<MetricsTable>`

Archivos: `MetricsTable.tsx`, `style/MetricsTable.module.css`.

Lee `metrics` del contexto. Dos tablas: por proceso (id, completion, turnaround, waiting, response) y agregadas (avgWaiting, avgTurnaround, cpuUtilization, throughput). Solo visibles en el último tick. Respeta la configuración de qué métricas mostrar.

**Cierra:** `BEHAVIOURS § Coherencia de métricas y estado` y `§ Renderizado — MetricsTable` — `tests/react/MetricsTable.test.tsx`

---

## Fase 7 — Documentación (`docs/`)

> **Prohibido crear componentes wrapper** (como `SimulatorDemo`, `SimulatorLayout` o similar) en `docs/` ni en `src/react/`. Las páginas `.mdx` importan directamente los componentes del módulo publicado (`cpu-scheduler`) y los componen inline. No existe ningún componente intermediario.

> **Página de inicio (`index.mdx`):** Es OBLIGATORIO mantener el archivo `docs/src/content/docs/index.mdx` con la plantilla `splash`. Este es el punto de entrada principal (`/`) de la web. NUNCA debe ser eliminado al generar el resto de la documentación.
### T-30 · Guías para desarrolladores

Tres guías: **cómo usar** el componente, **cómo configurarlo** (`processes`, `algorithm`, `quantum`, `metrics`) y **cómo crear un algoritmo** (implementar `IAlgorithm` y registrarlo).

**Hecha cuando:** las tres guías existen y son correctas; `astro check` pasa.

### T-31 · Página de demo FCFS
Archivo: `docs/src/content/docs/cpu-scheduler/non-preemptive/fcfs.mdx`



```mdx
---
title: FCFS (First-Come, First-Served)
description: Algoritmo de planificación FCFS no expropiativo.
---

import { SimulationProvider, ProcessTable, GanttChart, PlaybackControls, MetricsTable } from 'cpu-scheduler';

## Descripción

**FCFS** ejecuta los procesos en orden de llegada. Es no expropiativo: una vez que un
proceso entra en CPU, la ocupa hasta terminar su ráfaga.

## Escenario de ejemplo

<SimulationProvider
  algorithm="fcfs"
  processes={[
    { id: 'P1', arrival_time: 0, burst_time: 3 },
    { id: 'P2', arrival_time: 2, burst_time: 2 },
    { id: 'P3', arrival_time: 1, burst_time: 4 },
  ]}
  client:only="react"
/>
```

Si en el futuro se quiere intercalar texto entre los componentes, se pasan como children:

```mdx
<SimulationProvider algorithm="fcfs" processes={[...]} client:only="react">
  <ProcessTable />
  <p>Texto explicativo entre componentes</p>
  <GanttChart />
  <PlaybackControls />
  <MetricsTable />
</SimulationProvider>
```

**Cierra:** `BEHAVIOURS § Escenario de ejemplo por defecto` (ambos casos).

### T-32 · Páginas SJF, LJF y Prioridad no expropiativa

Una `.mdx` por algoritmo, **misma estructura que T-31** (import directo desde `'cpu-scheduler'`, sin wrapper). Cada página usa el primer escenario de ejemplo del criterio correspondiente en `BEHAVIOURS`.

Archivos:
- `docs/src/content/docs/cpu-scheduler/non-preemptive/sjf.mdx`
- `docs/src/content/docs/cpu-scheduler/non-preemptive/ljf.mdx`
- `docs/src/content/docs/cpu-scheduler/non-preemptive/prio-n.mdx`

Para prioridad, los procesos incluyen el campo `priority` y se indica en la descripción que menor número = mayor prioridad.

### T-33 · Páginas SRTF, Round Robin y Prioridad expropiativa

Misma estructura. Para Round Robin, el `SimulationProvider` recibe `params={{ quantum: N }}`.

Archivos:
- `docs/src/content/docs/cpu-scheduler/preemptive/srtf.mdx`
- `docs/src/content/docs/cpu-scheduler/preemptive/round-robin.mdx`
- `docs/src/content/docs/cpu-scheduler/preemptive/prio-p.mdx`

Ejemplo para Round Robin:

```mdx
<SimulationProvider
  algorithm="round-robin"
  processes={[
    { id: 'P1', arrival_time: 0, burst_time: 5 },
    { id: 'P2', arrival_time: 1, burst_time: 4 },
    { id: 'P3', arrival_time: 2, burst_time: 2 },
  ]}
  params={{ quantum: 2 }}
  client:only="react"
/>
```

Ejemplo para Prioridad expropiativa:

```mdx
<SimulationProvider
  algorithm="priority-p"
  processes={[
    { id: 'P1', arrival_time: 0, burst_time: 4, priority: 2 },
    { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
    { id: 'P3', arrival_time: 2, burst_time: 2, priority: 1 },
  ]}
  client:only="react"
/>
```


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
| Registro de algoritmos (Motor interno)    | T-06            |
| Contrato de algoritmo (extensibilidad)    | T-24, T-17, T-18, T19,T-20, T-21, T-22, T-23            |
| Simulador independiente de la vista       | T-15            |
| Estructura del resultado de simulación    | T-15            |
| Página de algoritmo y campos declarados   | T-26            |
| Configuración inválida (burst = 0)        | T-14, T-25      |
| Simular — FCFS                            | T-09, T-17      |
| Simular — SJF                             | T-18            |
| Simular — LJF                             | T-19            |
| Simular — Prioridad (no expropiativa)     | T-20            |
| Simular — SRTF                            | T-10, T-21      |
| Simular — Prioridad (expropiativa)        | T-22            |
| Simular — Round Robin                     | T-11, T-23      |
| CPU inactiva                              | T-07            |
| Seguridad y tolerancia a fallos           | T-14            |
| Determinismo                              | T-08            |
| Reproducción automática                   | T-28            |
| Navegación manual                         | T-16, T-28      |
| Coherencia de métricas y estado           | T-13, T-29      |
| Escenario de ejemplo por defecto          | T-25, T-31      |
| Conjunto vacío                            | T-14, T-25      |
| Renderizado — SimulationProvider          | T-25            |
| Renderizado — ProcessTable                | T-26            |
| Renderizado — GanttChart (matriz sincronizada)| T-27            |
| Renderizado — PlaybackControls            | T-28            |
| Renderizado — MetricsTable                | T-29            |

Documentación para desarrolladores → T-30.

---

## Hito de cierre de v1

v1 está terminada cuando **T-36** pasa: el módulo se construye como librería, los siete algoritmos verificados contra sus diagramas de Gantt, el componente con navegación y métricas, y `docs/` con las guías y un ejemplo por algoritmo. Cada criterio de `BEHAVIOURS-v01.md` tiene su test en verde.