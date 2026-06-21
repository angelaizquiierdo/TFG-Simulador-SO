# Plan de Implementación — CPUSchedulerSimulator v02

> Hoja de ruta secuencial. Cada tarea es atómica: tiene un resultado verificable y sus
> tests pasan antes de continuar con la siguiente.
>
> Fuentes: `SPECv-02.md` · `BEHAVIOURSv-02.md` · `TECHNICAL.md` · Ubicación: `specs/v-02/PLANv-02.md`
>

---

## Cómo se ejecuta este plan

- Tarea por tarea, en orden. Una tarea = un cambio pequeño y autocontenido.
- Al terminar cada tarea, antes de pasar a la siguiente:
  1. `npm run lint`, `npm run typecheck` y `npm test` deben pasar.
  2. Si la tarea añade funcionalidad o un algoritmo, se actualiza `docs/` en el mismo paso.
  3. **No hacer commit** hasta que la fase completa esté terminada.
- No se avanza si la tarea actual no pasa su validación.
- **Commit al finalizar cada fase.** Mensaje breve:

| Fase | Mensaje de commit |
|------|-------------------|
| 0 — Andamiaje | `fase-0: andamiaje` |
| 1 — Tipos y contratos | `fase-1: tipos` |
| 2 — Registro | `fase-2: registry` |
| 3 — Motor y E/S | `fase-3: motor` |
| 4 — Player | `fase-4: player` |
| 5 — Algoritmos (9) | `fase-5: algoritmos` |
| 6 — Componente React | `fase-6: componente` |
| 7 — Persistencia | `fase-7: persistencia` |
| 8 — Documentación | `fase-8: docs` |
| 9 — Estética | `fase-9: estetica` |
| 10 — Verificación final | `fase-10: verificacion` |

- Las fronteras de arquitectura las fuerza ESLint (`core` no importa React/DOM).
- "Cierra" indica los criterios de `BEHAVIOURSv-02.md` verificados con un test.

---

## Fase 0 — Andamiaje

### T-00 · Inicializar el proyecto principal (el módulo)

```bash
npm init -y
mkdir -p src/core/types \
         src/core/algorithms/non-preemptive \
         src/core/algorithms/preemptive \
         src/core/algorithms/shared \
         src/react src/react/style \
         tests/core/algorithms/non-preemptive \
         tests/core/algorithms/preemptive \
         tests/core/algorithms/shared \
         tests/react

# dependencias del módulo
npm install -D typescript vite @vitejs/plugin-react vite-plugin-dts \
  vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event \
  @testing-library/jest-dom eslint typescript-eslint \
  eslint-plugin-react-hooks eslint-plugin-jsx-a11y \
  react react-dom @types/react @types/react-dom
```

Crear y configurar:

- `package.json`: `name: "cpu-scheduler"`, `type: "module"`, `exports` → `./dist/index.js`,
  `peerDependencies` de React, `"workspaces": ["docs"]`, scripts:
  - `build` — vite build
  - `typecheck` — `tsc --noEmit`
  - `lint` — `eslint .`
  - `test` — `vitest run --passWithNoTests`
  - `test:coverage` — `vitest run --coverage`
  - `docs:dev` / `docs:build` / `docs:preview`
- `tsconfig.json`: `strict: true` + `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,
  `noImplicitReturns`. **No extiende el preset de Astro.**
- `vite.config.ts`: build de librería (`entry: src/index.ts`,
  `external: ['react','react-dom']`), Vitest con `environmentMatchGlobs`
  (`tests/core`→node, `tests/react`→jsdom), umbrales de cobertura
  `{ lines: 90, functions: 90, statements: 90, branches: 80 }`.
- ESLint: `strictTypeChecked` + `stylisticTypeChecked`, fronteras:
  - `src/core/**` no importa React/DOM ni `src/react/**`
  - `src/core/algorithms/**` solo importa `types/algorithm.ts`, `types/io.ts` y
    `algorithms/shared/**`; **nunca otro archivo de algorithms/**
  - `src/react/**` puede importar `src/core`, nunca al revés

**Nota sobre `priority?`:** `exactOptionalPropertyTypes` prohíbe asignar `undefined` explícitamente. Usar spread condicional: `...(val !== undefined ? { prop: val } : {})`.

**Verificación:** `typecheck`, `lint` y `test --passWithNoTests` pasan en vacío; un `import` prohibido de React desde core hace fallar el lint.

---

### T-01 · Crear el subproyecto `docs/` (Astro + Starlight)

```bash
npm create astro@latest docs -- --template starlight
cd docs && npx astro add react && cd ..
npm install
```

`docs/astro.config.mjs` con alias `'cpu-scheduler' → '../src/index.ts'` y sidebar:

```js
sidebar: [
  {
    label: 'No expropiativos',
    items: [
      { label: 'FCFS',          link: '/cpu-scheduler/non-preemptive/fcfs' },
      { label: 'SJF',           link: '/cpu-scheduler/non-preemptive/sjf' },
      { label: 'LJF',           link: '/cpu-scheduler/non-preemptive/ljf' },
      { label: 'Prioridad (NP)', link: '/cpu-scheduler/non-preemptive/prio-n' },
    ],
  },
  {
    label: 'Expropiativos',
    items: [
      { label: 'Round Robin',          link: '/cpu-scheduler/preemptive/round-robin' },
      { label: 'SRTF',                 link: '/cpu-scheduler/preemptive/srtf' },
      { label: 'Prioridad (P)',         link: '/cpu-scheduler/preemptive/prio-p' },
      { label: 'Round Robin Virtual',  link: '/cpu-scheduler/preemptive/virtual-round-robin' },
      { label: 'MLFQ',                 link: '/cpu-scheduler/preemptive/mlfq' },
    ],
  },
],
```

P�ginas vacías para los **9 algoritmos** (7 clásicos + VRR + MLFQ).

**Verificación:** `docs:dev` y `docs:build` pasan; el alias resuelve correctamente.

---

## Fase 1 — Tipos y contratos (`src/core/types/`)

> Solo definiciones de tipos. Nada ejecutable. Todos los tipos se crean con su forma final
> de v02 (incluida E/S, SchedulerEvent, Scenario, etc.), no se "expanden" después.

### T-02 · `Process` (`process.ts`)

```ts
interface Process {
  readonly id: string;
  readonly arrival_time: number;       // >= 0
  readonly burst_time: number;         // > 0
  readonly priority?: number;
  readonly io?: readonly IOOperation[]; // io_entry estrictamente crecientes; solo VRR
}
```

**Verificación:** compila en modo estricto.

### T-03 · `IOOperation` y `DeviceState` (`io.ts`)

```ts
interface IOOperation {
  readonly io_entry: number;   // CPU acumulada antes de bloquearse (>0, <burst_time)
  readonly io_time: number;    // duración del servicio (>0)
  readonly device?: string;    // por defecto '0' (un único dispositivo en v02)
}

interface DeviceState {
  readonly id: string;                 // '0' en v02
  readonly serving: string | null;     // pid en servicio
  readonly remaining: number;          // ticks restantes del servicio
  readonly queue: readonly string[];   // cola FCFS de pids esperando
}
```

**Verificación:** compila; `DeviceState.queue` es `readonly string[]`.

### T-04 · `ReadyProcess`, `PreemptionMode`, `SchedulerEvent` e `IAlgorithm` (`algorithm.ts`)

```ts
interface ReadyProcess {
  readonly id: string;
  readonly arrival_time: number;
  readonly burst_time: number;
  readonly remaining: number;
  readonly priority?: number;
}
// NO lleva `io`: el algoritmo decide CPU, no E/S.

type PreemptionMode =
  | 'none' | 'on-better' | 'on-quantum'
  | 'io-return' | 'on-quantum-and-better';

type SchedulerEvent =
  | { readonly type: 'arrival';        readonly id: string; readonly tick: number }
  | { readonly type: 'dispatch';       readonly id: string; readonly tick: number }
  | { readonly type: 'quantum-expiry'; readonly id: string; readonly tick: number }
  | { readonly type: 'preempted';      readonly id: string; readonly tick: number }
  | { readonly type: 'io-start';       readonly id: string; readonly tick: number }
  | { readonly type: 'io-return';      readonly id: string; readonly tick: number }
  | { readonly type: 'completed';      readonly id: string; readonly tick: number }
  | { readonly type: 'priority-boost'; readonly tick: number };

type AlgorithmParams = Readonly<Record<string, unknown>>;

interface IAlgorithm {
  readonly name: string;
  readonly preemptionMode: PreemptionMode;
  readonly requires: { priority?: boolean; quantum?: boolean; io?: boolean };
  select(ready: readonly ReadyProcess[]): ReadyProcess;
  quantumFor?(p: ReadyProcess): number | null;
  onEvent?(e: SchedulerEvent): string | null;
}
```

**Verificación:** `typecheck` confirma que una clase mínima implementa `IAlgorithm` sin
errores. El linter rechaza importar React/DOM desde este archivo.

### T-05 · `History` (`history.ts`)

```ts
interface HistoryEvent {
  readonly tick: number;
  readonly onCPU: string | null;
  readonly ready: readonly string[];
  readonly pending: readonly string[];
  readonly completed: readonly string[];
  readonly inIO: string | null;             // pid en servicio; null si no hay E/S
  readonly waitingIO: readonly string[];    // cola FCFS del dispositivo
  readonly message: string;
}

type History = readonly HistoryEvent[];

interface Interval {
  readonly pid: string | null;
  readonly start: number;
  readonly end: number;
}
```

**Verificación:** `typecheck` confirma que `History` es indexable con
`noUncheckedIndexedAccess` (devuelve `HistoryEvent | undefined`).

### T-06 · `SimulationResult` y métricas (`simulation-result.ts`)

```ts
interface ProcessMetrics {
  readonly id: string;
  readonly completion: number;
  readonly turnaround: number;
  readonly waiting: number;     // turnaround - CPU_total - bloqueado_total
  readonly response: number;
}
interface AggregateMetrics {
  readonly avgWaiting: number;
  readonly avgTurnaround: number;
  readonly cpuUtilization: number;
  readonly throughput: number;
}
// SimulationResult = { history; intervals: Interval[]; metrics }
```

`intervals` y `metrics` se **derivan** del `history` con funciones puras.

### T-07 · `Scenario` (`scenario.ts`)

```ts
interface Scenario {
  readonly name?: string;
  readonly processes: readonly Process[];
  readonly algorithm: string;
  readonly params: AlgorithmParams;
  readonly whatIf?: { fromTick: number; state: SchedulerState };
}
```

**Verificación:** `typecheck`.

---

## Fase 2 — Registry (`src/core/registry.ts`)

### T-08 · Registro y búsqueda

`register(algo: IAlgorithm): void` y `get(name: string): IAlgorithm` (error descriptivo si
no existe, listando los disponibles; si vacío muestra "(ninguno)"). Singleton.

**Cierra:** `BEHAVIOURSv-02 § Registro de algoritmos` — `tests/core/registry.test.ts`

---

## Fase 3 — Motor (`src/core/simulate.ts`) y subsistema de E/S

> El motor es el único que escribe el `history`. Prohibido `Math.random` y `Date.now`.
> Se construye con soporte completo de E/S desde el principio.

### T-09 · Bucle tick a tick y CPU inactiva

`run(processes, config): SimulationResult`. Incorporar llegadas por tick, detectar CPU
inactiva, escribir un `HistoryEvent` por tick con `message`, `inIO: null`,
`waitingIO: []`.

**Cierra:** `§ CPU inactiva` — `tests/core/simulate.test.ts`

### T-10 · Desempate global

Ordenar `ready` antes de `select()`: criterio del algoritmo → menor `arrival_time` →
menor `id` (comparación natural: "P2" antes que "P10").

**Cierra:** `§ Determinismo sin E/S` — `tests/core/simulate.test.ts`

### T-11 · Modo `'none'` (no expropiativo)

El motor llama a `select()` solo cuando la CPU queda libre. Validar con FCFS stub.

**Cierra:** `§ Simular — FCFS` — `tests/core/simulate.test.ts`

### T-12 · Modo `'on-better'` (expropiativo por mejor proceso)

Reevalúa cada tick; si `select()` devuelve otro proceso, expropia.

**Cierra:** `§ Simular — SRTF` — `tests/core/simulate.test.ts`

### T-13 · Modo `'on-quantum'` (Round Robin)

Expropia al agotar el quantum y reencola. Usa `algorithm.quantumFor(p)` si existe;
si no, usa `config.quantum`. Coincidencia en un tick: la llegada entra antes que el
reencolado.

**Cierra:** `§ Simular — Round Robin` — `tests/core/simulate.test.ts`

### T-14 · Subsistema de E/S (`io-subsystem.ts`)

Mecánica del dispositivo: avanzar servicio en curso, admitir cabeza de cola FCFS cuando
queda libre, devolver proceso servido a `ready`. Puro y determinista.

**Cierra:** `§ Contención del dispositivo de E/S` — `tests/core/io-subsystem.test.ts`

### T-15 · Integrar E/S en el motor

Si `algorithm.requires.io`, activar `io-subsystem` en el bucle. Orden intra-tick:
consumo CPU/E/S → fin tramo CPU (completar / iniciar E/S) → fin servicio E/S →
inserciones en ready: **io-return → llegadas → quantum** (cada grupo por `id`) → reparto.
Rellenar `inIO`/`waitingIO` en `HistoryEvent`. Si `!requires.io`, `inIO=null`,
`waitingIO=[]`.

**Cierra:** `§ Orden intra-tick y empate ráfaga/quantum` — `tests/core/simulate.test.ts`

### T-16 · Modo `'io-return'`

Al recibir retorno de E/S con `preemptionMode = 'io-return'`, expropiar al proceso en
CPU si el recién llegado tiene prioridad (cola auxiliar > principal en VRR).

**Cierra:** `§ Determinismo con E/S (VRR)` (desempate) — `tests/core/simulate.test.ts`

### T-17 · Modo `'on-quantum-and-better'`

Expropia por quantum agotado **y** por llegada a nivel superior. Incluye priority-boost:
cada `boostInterval` ticks, emitir evento `'priority-boost'`, reencolar todos a nivel 0,
expropiar al de CPU si deja de ser elegido.

**Cierra:** `§ Determinismo con niveles (MLFQ)` — `tests/core/simulate.test.ts`

### T-18 · Mensajes ricos

El motor llama a `algorithm.onEvent(event)`. Si devuelve un `string`, lo incorpora a
`HistoryEvent.message`. Si devuelve `null`, usa la frase genérica.

**Cierra:** `§ Mensajes ricos — HistoryEvent.message` — `tests/core/simulate.test.ts`

### T-19 · Derivación de `intervals` y `metrics` (funciones puras)

`deriveIntervals(history)` y `deriveMetrics(history, processes)`.
`waiting = turnaround − CPU_total − bloqueado_total` (en clásicos `bloqueado_total = 0`).
`cpuUtilization = ticks_CPU_ocupada / makespan`.

**Cierra:** `§ Historial y métricas` (todos los criterios) — `tests/core/simulate.test.ts`

### T-20 · Coherencia del `history`

`completed` crece monotónicamente. `message` describe el evento.

**Cierra:** `§ Coherencia de métricas y estado` — `tests/core/simulate.test.ts`

### T-21 · `runFrom(state)` para what-if

`runFrom(state, algorithm, params): SimulationResult`. Toma un `SchedulerState` como
condición inicial; simula hacia delante. Determinista.

**Cierra:** `§ Rederivación — what-if e inyección en vivo` (criterios 1–3) — `tests/core/simulate.test.ts`

### T-22 · Inyección en vivo

Añadir un proceso con `arrival_time ≥ tick_actual` → rederiva con `runFrom`. Si
`arrival_time < tick_actual` → error claro.

**Cierra:** `§ Rederivación` (criterios 4–5) — `tests/core/simulate.test.ts`

### T-23 · Casos límite y validación

- Sin procesos: `history` vacío, sin error.
- `burst_time ≤ 0` o `arrival_time < 0`: error.
- `io_entry ≤ 0`, `io_entry ≥ burst_time`, `io_time ≤ 0`, `io_entry` no crecientes: error.
- Más de 100.000 ticks: error (protección anti-bucle).
- Algoritmo defectuoso (select devuelve id inexistente): CPU inactiva.

**Cierra:** `§ Conjunto vacío`, `§ Configuración inválida`, `§ Validación de configuración`,
`§ Seguridad y tolerancia a fallos` — `tests/core/simulate.test.ts`

### T-24 · Aislamiento de dependencias (Node)

Test que importa `run()` desde Node sin React/DOM.

**Cierra:** `§ Simulador independiente de la vista`, `§ Estructura del resultado` — `tests/core/simulate.test.ts`

---

## Fase 4 — Player (`src/core/player.ts`)

### T-25 · Cursor sobre el `history`

`Player` con `tick`, `stepForward()`, `stepBackward()`, `goTo(n)`, `atStart`, `atEnd`.
Puro: sin `requestAnimationFrame`/`setTimeout`/`deltaTime`.

**Cierra:** `§ Navegación manual` — `tests/core/player.test.ts`

---

## Fase 5 — Algoritmos (`src/core/algorithms/`)

> Cada algoritmo implementa `IAlgorithm` en su clase y no accede a los internos del motor.
> Los 9 son independientes entre sí. VRR y MLFQ usan `shared/FifoQueue`.

### T-26 · Utilidad compartida `FifoQueue` (`shared/fifo-queue.ts`)

`FifoQueue<T>` con `enqueue`, `dequeue`, `peek`, `isEmpty`, `toArray`. Sin dependencias.

**Verificación:** `tests/core/algorithms/shared/fifo-queue.test.ts`

### T-27–T-33 · Algoritmos clásicos (7)

| ID | Archivo | `preemptionMode` | `requires.io` | `select` | Cierra | Test |
|----|---------|------------------|:---:|----------|--------|------|
| T-27 | `non-preemptive/fcfs.ts` | `'none'` | false | FIFO | `§ Simular — FCFS` | `fcfs.test.ts` |
| T-28 | `non-preemptive/sjf.ts` | `'none'` | false | menor `remaining` | `§ Simular — SJF` | `sjf.test.ts` |
| T-29 | `non-preemptive/ljf.ts` | `'none'` | false | mayor `burst_time` | `§ Simular — LJF` | `ljf.test.ts` |
| T-30 | `non-preemptive/priority-np.ts` | `'none'` | false | menor `priority` | `§ Simular — Prioridad (NP)` | `priority-np.test.ts` |
| T-31 | `preemptive/srtf.ts` | `'on-better'` | false | menor `remaining` | `§ Simular — SRTF` | `srtf.test.ts` |
| T-32 | `preemptive/priority-p.ts` | `'on-better'` | false | menor `priority` | `§ Simular — Prioridad (P)` | `priority-p.test.ts` |
| T-33 | `preemptive/round-robin.ts` | `'on-quantum'` | false | FIFO | `§ Simular — Round Robin` | `round-robin.test.ts` |

Todos declaran `requires: { ..., io: false }` desde el inicio.

**Cierra también:** `§ Algoritmos clásicos — solo CPU` (ignoran `io` en procesos)

### T-34 · Round Robin Virtual (`preemptive/virtual-round-robin.ts`)

`preemptionMode: 'io-return'`, `requires: { io: true, quantum: true }`.
Estado interno: `mainQueue: FifoQueue<string>`, `auxQueue: FifoQueue<string>`,
`remainingSlice: Map<string, number>`.

Implementa `select` (auxQueue → mainQueue), `quantumFor` (sobrante desde auxQueue,
quantum completo desde mainQueue), `onEvent` (mantiene colas + devuelve motivo rico:
"se inserta en la cola auxiliar con sobrante de N", "desde la cola principal", etc.).

Reglas:
1. Llegada nueva → `mainQueue`.
2. Agota quantum → `mainQueue`.
3. Se bloquea por E/S antes de agotar quantum → al volver, `auxQueue` con sobrante.
   Si sobrante = 0 → `mainQueue`.
4. `select`: cabeza de `auxQueue` si no vacía; si no, cabeza de `mainQueue`.
5. `quantumFor`: sobrante desde `auxQueue`, quantum completo desde `mainQueue`.
6. **Sí expropia** en io-return: si CPU ejecuta desde mainQueue y llega proceso a
   auxQueue, expropia inmediatamente.

**Cierra:** `§ Simular — Round Robin Virtual`, `§ Round Robin Virtual — E/S y cola auxiliar`,
`§ Determinismo con E/S (VRR)` — `tests/core/algorithms/preemptive/virtual-round-robin.test.ts`

### T-35 · MLFQ (`preemptive/multilevel-feedback.ts`)

`preemptionMode: 'on-quantum-and-better'`, `requires: { io: false }`.
Estado interno: `levels: FifoQueue<string>[]`, `processLevel: Map<string, number>`.

Implementa `select` (nivel no vacío de menor índice), `quantumFor`
(`quanta[processLevel.get(pid)]`), `onEvent` (mantiene niveles + devuelve motivo rico:
"se degrada al nivel N", "llega al nivel 0", "priority boost: todos suben al nivel 0").

Reglas:
1. Llegada nueva → `levels[0]`.
2. `select`: cabeza de `levels[i]` para menor `i` no vacío.
3. `quantumFor`: `quanta[processLevel.get(pid)]`.
4. Agota quantum → degrada a `min(nivel + 1, último)`.
5. Expropiación: llegada a `levels[0]` expropia al de nivel inferior. Expropiado
   vuelve a cabeza de su nivel (no degrada).
6. Priority boost: cada `boostInterval` ticks, todos a `levels[0]` (incluido el de
   CPU). Empate: menor `id`. Sin `boostInterval` → sin boost.

**Cierra:** `§ Simular — MLFQ`, `§ MLFQ — niveles y degradación`,
`§ Determinismo con niveles (MLFQ)` — `tests/core/algorithms/preemptive/multilevel-feedback.test.ts`

### T-36 · Contrato de extensibilidad

Algoritmo de prueba con `onEvent` + `quantumFor` registrado y simulado sin tocar el motor.

**Cierra:** `§ Contrato de algoritmo (extensibilidad)`, `§ Verificación de contrato` — `tests/core/algorithms/contracts.test.ts`

---

## Fase 6 — Componente React (`src/react/`)

> Los componentes se conectan mediante React Context (uno por simulación).
> `SimulationProvider` es el único que llama al core; los visuales solo leen del contexto.
> Cada componente crea su `.module.css` en `src/react/style/`.
> Se construyen con todas las features de v02 desde el inicio (ProcessForm,
> AlgorithmParamsForm, GanttChart con tamaño fijo, estados de E/S, etc.).

### T-37 · `SimulationContext` + `<SimulationProvider>`

Archivos: `SimulationContext.ts`, `SimulationProvider.tsx`,
`style/SimulationProvider.module.css`.

`SimulationContext.ts`: contexto y hook `useSimulation()` (error si se usa fuera del
Provider).

`SimulationProvider.tsx`: recibe `{ algorithm, processes, params? }`. Al montar: llama a
`run()`, instancia un `Player`, expone por contexto `SimulationResult`, `HistoryEvent`
actual, `Player` y error. Gestiona `sessionStorage` (clave
`scheduler-scenario:${algorithmName}`). Soporta `runFrom()` para what-if/inyección.

**Cierra:** `§ Render — SimulationProvider`, `§ Conjunto vacío`, `§ Configuración inválida`,
`§ Escenario de ejemplo por defecto` — `tests/react/SimulationProvider.test.tsx`

### T-38 · `<ProcessTable>`

Archivos: `ProcessTable.tsx`, `style/ProcessTable.module.css`.

Lee procesos y descriptor del algoritmo (`requires`) del contexto. Columnas base: `id`,
`arrival_time`, `burst_time`. Columna `priority` solo si `requires.priority`. Columnas
`io_entry`, `io_time`, `io_exit` (derivado) solo si `requires.io`. Filas alternadas.

**Cierra:** `§ Página de algoritmo y campos declarados`, `§ Render — ProcessTable` — `tests/react/ProcessTable.test.tsx`

### T-39 · `<GanttChart>` (tamaño fijo, estados de E/S)

Archivos: `GanttChart.tsx`, `style/GanttChart.module.css`.

Layout de arriba abajo:
1. **Mensaje** — `HistoryEvent.message` del tick actual (mensaje rico).
2. **Matriz** — tamaño **fijo desde el inicio**: todas las columnas renderizadas,
   navegar solo cambia el color. Celdas sin texto, solo color.
   - En CPU = sólido. En espera = opacidad reducida. CPU inactiva = gris.
   - No llegado / completado = vacío (sin color).
   - **En E/S (servicio)** = trama diagonal (rayado) — solo si `requires.io`.
   - **Esperando dispositivo** = trama distinta (punteado) — solo si `requires.io`.
3. **Leyenda** — estados condicionados: Inactivo, En espera, En CPU; si `requires.io`
   también En E/S y Esperando E/S.

Paleta automática ≥10 colores.

**Cierra:** `§ Render — GanttChart` (todos los criterios v02) — `tests/react/GanttChart.test.tsx`

### T-40 · `<PlaybackControls>`

Archivos: `PlaybackControls.tsx`, `style/PlaybackControls.module.css`.

Botones: ⏮ ◀ ▶/⏸ ▶| ⏭. Barra de desplazamiento, indicador `Tick: N / Total`.
`deltaTime` y `requestAnimationFrame` **solo aquí**.

**Cierra:** `§ Reproducción automática`, `§ Navegación manual`,
`§ Render — PlaybackControls` — `tests/react/PlaybackControls.test.tsx`

### T-41 · `<MetricsTable>`

Archivos: `MetricsTable.tsx`, `style/MetricsTable.module.css`.

Dos tablas: por proceso y agregadas. Solo visibles en el último tick.

**Cierra:** `§ Coherencia de métricas y estado`, `§ Render — MetricsTable` — `tests/react/MetricsTable.test.tsx`

### T-42 · `<ProcessForm>` (panel desplegable)

Archivos: `ProcessForm.tsx`, `style/ProcessForm.module.css`.

Panel **cerrado por defecto**. Al abrir: todos los procesos con campos editables.
Rederiva al instante (sin botón Aplicar). Campos condicionales: `priority` si
`requires.priority`, `io_entry`/`io_time` si `requires.io`. Añadir/eliminar proceso.
Inyección en vivo (`arrival_time ≥ tick_actual`).

**Cierra:** `§ ProcessForm — panel desplegable` — `tests/react/ProcessForm.test.tsx`

### T-43 · `<AlgorithmParamsForm>` (draft vs applied)

Archivos: `AlgorithmParamsForm.tsx`, `style/AlgorithmParamsForm.module.css`.

**Visible desde el primer render** si el algoritmo tiene parámetros. Estado `draft` vs
`applied`. Botón "Aplicar" + `validateParams`. `boostInterval` vacío = sin boost.
Reset al cambiar de algoritmo.

**Cierra:** `§ AlgorithmParamsForm` — `tests/react/AlgorithmParamsForm.test.tsx`

---

## Fase 7 — Persistencia por sesión

### T-44 · `sessionStorage` con clave por página

`SimulationProvider` guarda/restaura `Scenario` en `sessionStorage` bajo
`scheduler-scenario:${algorithmName}`. Se pierde al cerrar la pestaña. Acción de reset.
Clave por página (navegar entre páginas no mezcla escenarios).

**Cierra:** `§ Persistencia por sesión`, `§ Escenario de ejemplo por defecto` (criterios
v02) — `tests/react/SimulationProvider.test.tsx`

---

## Fase 8 — Documentación (`docs/`)

> **Prohibido crear componentes wrapper.** Las páginas `.mdx` importan directamente desde
> `'cpu-scheduler'` y componen inline.
> **Mantener `index.mdx`** con plantilla `splash` como punto de entrada.

### T-45 · Guías para desarrolladores

Tres guías: cómo usar, cómo configurar (procesos, algorithm, params, E/S), cómo crear un
algoritmo (implementar `IAlgorithm` con `onEvent`/`quantumFor`). Documentar edición,
what-if, persistencia por sesión.

### T-46 · Página de demo FCFS

```mdx
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

**Cierra:** `§ Escenario de ejemplo por defecto`

### T-47 · Páginas SJF, LJF, Prioridad NP

### T-48 · Páginas SRTF, Round Robin, Prioridad P

Round Robin con `params={{ quantum: 2 }}`.

### T-49 · Página Round Robin Virtual

Con **dos procesos con E/S** para que se note la cola auxiliar vs principal.
`AlgorithmParamsForm` visible de inicio con quantum.

```mdx
<SimulationProvider
  algorithm="rrv"
  processes={[
    { id: 'P1', arrival_time: 0, burst_time: 6, io: [{ io_entry: 2, io_time: 3 }] },
    { id: 'P2', arrival_time: 0, burst_time: 4, io: [{ io_entry: 1, io_time: 4 }] },
    { id: 'P3', arrival_time: 0, burst_time: 3 },
  ]}
  params={{ quantum: 4 }}
  client:only="react"
/>
```

### T-50 · Página MLFQ

Escenario solo CPU. `AlgorithmParamsForm` con `quanta` y `boostInterval` visibles de inicio.

```mdx
<SimulationProvider
  algorithm="mlfq"
  processes={[
    { id: 'P1', arrival_time: 0, burst_time: 8 },
    { id: 'P2', arrival_time: 0, burst_time: 8 },
  ]}
  params={{ quanta: [2, 10], boostInterval: 6 }}
  client:only="react"
/>
```

---

## Fase 9 — Estética

### T-51 · Tokens de diseño

Paleta de procesos ≥10 colores alto contraste, tipografía, espaciado, estados
(CPU/espera/E·S/esperando-E·S/inactivo) en CSS Modules. Aplicar a todos los componentes
sin romper contratos de render.

**Verificación:** todos los tests de render siguen verdes.

---

## Fase 10 — Verificación final

### T-52 · Cobertura completa de `BEHAVIOURSv-02.md`

Cada criterio tiene al menos un test que pasa.

### T-53 · Typecheck y lint limpios

`typecheck` y `lint` sin warnings; `astro check` sin errores en `docs/`.

### T-54 · Build de producción

`npm run build` genera la librería; `npm run docs:build` genera el sitio. En
`docs:preview`: se ven los mensajes ricos de VRR y MLFQ, los estados de E/S en el
Gantt, la contención, las métricas coherentes, la persistencia por sesión, la edición
desde ProcessForm y AlgorithmParamsForm.

---

## Dependencias entre fases

```
Fase 0 (T-00, T-01)
  └─► Fase 1 (T-02 … T-07)
        └─► Fase 2 (T-08)
              └─► Fase 3 (T-09 … T-24)
                    ├─► Fase 4 (T-25)
                    │     └─► Fase 6 (T-37 … T-43) ─► Fase 7 (T-44)
                    │           └─► Fase 8 (T-45 … T-50) ─► Fase 9 (T-51)
                    │                 └─► Fase 10 (T-52 … T-54)
                    └─► Fase 5 (T-26 … T-36) ← paralelos entre sí
```

---

## Trazabilidad BEHAVIOURSv-02 ↔ tareas

| Criterio `BEHAVIOURSv-02.md` | Tarea(s) |
|-------------------------------|----------|
| Registro de algoritmos | T-08 |
| Contrato de algoritmo (extensibilidad) | T-36 |
| Simulador independiente de la vista | T-24 |
| Estructura del resultado de simulación | T-24 |
| Página de algoritmo y campos declarados | T-38, T-49, T-50 |
| Algoritmos clásicos — solo CPU | T-27…T-33 |
| Validación de configuración | T-23 |
| Simular — FCFS | T-11, T-27 |
| Simular — SJF | T-28 |
| Simular — LJF | T-29 |
| Simular — Prioridad (NP) | T-30 |
| Simular — SRTF | T-12, T-31 |
| Simular — Prioridad (P) | T-32 |
| Simular — Round Robin | T-13, T-33 |
| Simular — MLFQ | T-35 |
| Simular — Round Robin Virtual | T-34 |
| CPU inactiva | T-09 |
| Seguridad y tolerancia a fallos | T-23 |
| Determinismo sin E/S | T-10 |
| Determinismo con E/S (VRR) | T-16, T-34 |
| Determinismo con niveles (MLFQ) | T-17, T-35 |
| Orden intra-tick y empate ráfaga/quantum | T-15 |
| Historial y métricas | T-19 |
| Round Robin Virtual — cola auxiliar y sobrante | T-34 |
| Contención del dispositivo de E/S | T-14 |
| MLFQ — niveles y degradación | T-35 |
| Mensajes ricos (`onEvent` → string) | T-18 |
| Rederivación — what-if e inyección | T-21, T-22 |
| Reproducción automática | T-40 |
| Navegación manual | T-25, T-40 |
| Coherencia de métricas y estado | T-20, T-41 |
| Escenario de ejemplo por defecto | T-37, T-44, T-46 |
| Conjunto vacío | T-23, T-37 |
| Render — SimulationProvider | T-37 |
| Render — ProcessTable | T-38 |
| Render — GanttChart | T-39 |
| Render — PlaybackControls | T-40 |
| Render — MetricsTable | T-41 |
| `ProcessForm` — panel desplegable | T-42 |
| `AlgorithmParamsForm` — draft vs applied | T-43 |
| Persistencia por sesión | T-44 |
| Verificación de contrato v02 | T-36 |

---

## Hito de cierre

v02 está terminada cuando **T-54** pasa: los 9 algoritmos verificados contra sus fixtures,
subsistema de E/S con contención, mensajes ricos, edición desde la demo (ProcessForm +
AlgorithmParamsForm), rederivación what-if e inyección en vivo, persistencia por sesión,
estética con tokens de diseño, y `docs/` con las guías y un ejemplo por algoritmo (incluidos
VRR y MLFQ). Cada criterio de `BEHAVIOURSv-02.md` tiene su test en verde.