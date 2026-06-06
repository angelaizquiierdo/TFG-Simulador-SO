# CPUSchedulerSimulator — Decisiones técnicas

> **El objetivo del proyecto es un módulo reutilizable** (paquete de JavaScript/TypeScript)
> que implementa el **simulador + el componente** y que se puede instalar como una
> **dependencia** (`npm install`). El sitio de documentación es un subproyecto en `docs/`
> (Astro + Starlight) que documenta y demuestra el módulo; la web no es el fin.
>
> Convención: **todos los identificadores del código (tipos, campos, métodos, archivos y
> carpetas) están en inglés**; la prosa de los documentos está en español.

---

## Arquitectura: tres capas desacopladas

La dependencia va en **una sola dirección**: **demo → componente → simulador**. Nunca al
revés. El valor (el simulador) no queda atado a una vista.

1. **Simulador (`src/core`)** — toda la lógica. TypeScript puro, **sin React ni DOM**. Usable desde cualquier librería de interfaz o desde un script de Node.
2. **Componente React (`src/react`)** — **consume** el simulador y **renderiza** los resultados. Depende del simulador; el simulador no depende de él.
3. **Documentación (`docs/`)** — subproyecto Astro + Starlight: documentación para desarrolladores (cómo usar, configurar y crear algoritmos) que embebe el componente como isla, con un ejemplo de uso por algoritmo.

---

## Stack

**Proyecto principal (componente + simulador):**

- **Simulador:** TypeScript puro, sin dependencias de interfaz.
- **Componente:** React. Consume el simulador y renderiza.
- **Build:** se construye y se publica como **librería** (Vite en modo lib o `tsup`).
  **Astro no interviene en el proyecto principal.**
- **Vitest** (simulador) y **Testing Library** (componente).

**Subproyecto de documentación (`docs/`):**

- **Astro** con **Starlight**. Documentación para desarrolladores: cómo usar el componente, cómo configurarlo, cómo crear un algoritmo (`IAlgorithm`) y un ejemplo en vivo por algoritmo (una página `.mdx` cada uno, embebido como isla).
- **Vive en el mismo repositorio**, como subdirectorio `docs/` con su propio `package.json`.
- **La documentación se mantiene al día con el código:** cada funcionalidad o algoritmo actualiza su página en `docs/` en el mismo cambio.
- Sin backend ni persistencia.

---

## Estructura del proyecto

```
/                              # proyecto principal = módulo (simulador + componente)
  src/
    core/                      # TypeScript puro. Sin DOM, sin React, sin Astro.
      types/
        process.ts             # Process
        scheduler-state.ts     # SchedulerState
        algorithm.ts           # IAlgorithm + ReadyProcess + PreemptionMode
        history.ts             # HistoryEvent, History, Interval
        simulation-result.ts   # SimulationResult, ProcessMetrics, AggregateMetrics
      registry.ts              # registro de algoritmos por name
      simulate.ts              # run(): history + intervals + metrics
      player.ts                # cursor sobre el history (tiempo lógico, puro)
      algorithms/              # cada algoritmo implementa IAlgorithm en su propia clase
        non-preemptive/
          fcfs.ts
          sjf.ts
          ljf.ts
          priority-np.ts
        preemptive/
          srtf.ts
          round-robin.ts
          priority-p.ts
    react/                     # componente (islas React)
      Simulator.tsx
      GanttChart.tsx
      PlaybackControls.tsx     # ÚNICO sitio con deltaTime / requestAnimationFrame
      MetricsTable.tsx
      ProcessForm.tsx          # edición de procesos -> fuera de v1
    style/
      *.module.css             # CSS Modules
    index.ts                   # exporta el simulador (headless) y el componente
  tests/
    core/                      # Vitest: deterministas, en Node
    react/                     # Testing Library (jsdom)
  package.json
  tsconfig.json
  vite.config.ts

docs/                          # subproyecto Astro + Starlight (documentación)
  src/content/docs/cpu-scheduler/
    non-preemptive/
      fcfs.mdx
      sjf.mdx
      ljf.mdx
      prio-n.mdx
    preemptive/
      round-robin.mdx
      srtf.mdx
      prio-p.mdx
  astro.config.mjs
  package.json                 # depende del módulo
  tsconfig.json                # extends astro/tsconfigs/strictest
```

---

## Contrato del algoritmo (`IAlgorithm`)

Es el **único punto de acoplamiento** entre un algoritmo y el simulador. Cada algoritmo va en **su propia clase**, implementa este contrato y **no accede a los internos del motor** (ni al history, ni a las metrics, ni al `Player`, ni al tipo de estado interno).

```ts
type PreemptionMode = 'none' | 'on-better' | 'on-quantum';

interface ReadyProcess {            // vista de solo lectura que entrega el motor
  readonly id: string;
  readonly arrival_time: number;
  readonly burst_time: number;
  readonly remaining: number;       // ráfaga que le queda
  readonly priority?: number;
}

interface IAlgorithm {
  readonly name: string;                  // identificador del algoritmo
  readonly preemptionMode: PreemptionMode;
  readonly requires: { priority?: boolean; quantum?: boolean };

  select(ready: readonly ReadyProcess[]): ReadyProcess;   // única firma obligatoria
}
```

La clase puede tener miembros propios adicionales (p. ej. `version`); el contrato solo exige lo anterior. **El motor** (`simulate.ts`) posee la mecánica; el algoritmo solo aporta la **política de selección**:

- `'none'` → el motor pide selección solo cuando la CPU queda libre (FCFS, SJF, LJF,
  Prioridad no expropiativa).
- `'on-better'` → reevalúa cada tick y expropia si `select()` devuelve otro proceso (SRTF,
  Prioridad expropiativa).
- `'on-quantum'` → expropia al agotar el `quantum`; `select()` es FIFO (Round Robin).

El motor entrega `ready` ya ordenado por el desempate global (`arrival_time`, luego `id`); cada algoritmo solo aplica su criterio principal.

> No es un `simulate(processes, config): Result`: eso obligaría a cada algoritmo a
> reimplementar la lógica del simulador y mezclarse con ella. La política lo mantiene
> desacoplado.

---

## Contrato del historial (`History`)

```ts
interface HistoryEvent {
  readonly tick: number;
  readonly onCPU: string | null;            // id del proceso en CPU, o null si inactiva
  readonly ready: readonly string[];
  readonly pending: readonly string[];
  readonly completed: readonly string[];
  readonly message: string;                 // "P2 entra en CPU", "P1 finaliza", ...
}

type History = readonly HistoryEvent[];     // índice = tick

interface Interval {                        // tramo del Gantt, derivado del History
  readonly pid: string | null;              // null = hueco de inactividad
  readonly start: number;
  readonly end: number;
}
```

`SimulationResult` = `{ history; intervals: Interval[]; metrics: { perProcess: ProcessMetrics[]; aggregate: AggregateMetrics } }`. Los `intervals` y las `metrics` se **derivan** del `history` con funciones puras; no se acumulan durante el bucle.

Métricas: `ProcessMetrics` = `{ id, completion, turnaround, waiting, response }`;`AggregateMetrics` = `{ avgWaiting, avgTurnaround, cpuUtilization, throughput }`.

---

## TypeScript: configuración estricta

- **Proyecto principal:** `strict` activado más comprobaciones extra. **No extiende el preset de Astro** (Astro no está en el proyecto principal).

```jsonc
// tsconfig.json (raíz)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,   // history[i] devuelve T | undefined
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "declaration": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- **Subproyecto `docs/`:** su `tsconfig` extiende `astro/tsconfigs/strictest`.
- Prohibido `any` implícito o explícito en el simulador.

---

## ESLint: configuración estricta y con tipos

- `typescript-eslint` con `strictTypeChecked` + `stylisticTypeChecked`, *type-aware*.
- Plugins: `eslint-plugin-react-hooks` y `eslint-plugin-jsx-a11y` en `src/react`; `eslint-plugin-astro` en `docs/`.
- **Fronteras forzadas por linter** (con `no-restricted-imports` o `eslint-plugin-boundaries`):
  - `src/core/**` no importa React, el DOM ni `src/react/**`.
  - `src/core/algorithms/**` solo importa el contrato (`types/algorithm.ts`), nunca `simulate.ts`, `player.ts` ni otros internos del motor.
  - `src/react/**` puede importar `src/core`, pero `src/core` **nunca** importa React.

---

## Plan de implementación paso a paso

> El desglose en tareas atómicas está en `specs/PLAN.md`. Orden de abajo arriba
> (simulador → componente → documentación). Cada fase que añade funcionalidad o un
> algoritmo actualiza su documentación en `docs/` en el mismo cambio.

- **Fase 0 — Andamiaje:** proyecto principal + subproyecto `docs/`; TypeScript estricto, ESLint con fronteras, Vitest.
- **Fase 1 — Tipos y contratos:** `Process`, `SchedulerState`, `IAlgorithm`/`ReadyProcess`/ `PreemptionMode`, `History`/`HistoryEvent`/`Interval`, `SimulationResult`.
- **Fase 2 — Registro:** registrar y obtener algoritmos por `name`.
- **Fase 3 — Motor (`simulate.ts`):** bucle por ticks, desempate global, `select()` según `preemptionMode`, `HistoryEvent` con `message`; derivación pura de `intervals` y `metrics`.
- **Fase 4 — Player (`player.ts`):** cursor sobre el `history` con límites.
- **Fase 5 — Algoritmos, uno a uno con su test:**

| Algoritmo        | `preemptionMode` | `select` elige…            |
|------------------|------------------|----------------------------|
| FCFS             | `'none'`         | menor `arrival_time` (FIFO)|
| SJF              | `'none'`         | menor `remaining`          |
| LJF              | `'none'`         | mayor `burst_time`         |
| Prioridad (NP)   | `'none'`         | menor `priority`           |
| SRTF             | `'on-better'`    | menor `remaining`          |
| Prioridad (P)    | `'on-better'`    | menor `priority`           |
| Round Robin      | `'on-quantum'`   | FIFO                       |

- **Fase 6 — Componente React (`src/react`):** `Simulator.tsx` orquesta (config → `run` → índice → subcomponentes).
- **Fase 7 — Documentación (`docs/`):** guías (usar, configurar, crear algoritmo) y una página por algoritmo que embebe el componente.

---

## Testing

- Cada criterio de `BEHAVIOURS-v01.md` corresponde al menos a un test.
- **Simulador (Vitest, en Node):** algoritmos contra Gantt conocidos, métricas a mano, determinismo, y un test que **importa el simulador sin React** para confirmar que no arrastra dependencias de interfaz.
- **Contrato `IAlgorithm`:** un algoritmo de prueba mínimo se registra y simula **sin modificar el motor**.
- **Componente (Testing Library, jsdom):** renderizado, validación de configuración, campos según el descriptor y controles de reproducción (límites en 0 y en el último tick).
- Entornos separados en Vitest: `tests/core` en node, `tests/react` en jsdom.

---

## Requisitos no funcionales (medibles)

- **Rendimiento:** el cálculo completo de la línea temporal para ~50 procesos instantáneo a percepción del usuario (objetivo < 100 ms).
- **Tamaño de entrada:** se valida con ~50 procesos; sin límite duro en v1.

---

## Restricciones de arquitectura

- **El simulador no depende de la vista** (frontera forzada por ESLint).
- **Cada algoritmo implementa `IAlgorithm` en su clase y no accede a los internos del motor.**
- **El motor avanza por pasos (`state → state`)** y es el único que toca history, messages, metrics y reproducción.
- **Tiempo lógico en el simulador (ticks); `deltaTime` solo en `PlaybackControls`.**
- **Determinismo:** prohibido `Math.random` y `Date.now`; desempate fijado en la spec.
- **Añadir un algoritmo** = una clase `IAlgorithm` + registrarla por `name`; no se toca el motor ni el componente.

---

## Scripts

```
# Proyecto principal (el módulo)
build      # construye el componente como librería (Vite/tsup)
typecheck  # tsc --noEmit
lint       # eslint .
test       # vitest

# Subproyecto docs/
docs:dev      # arranca Astro en desarrollo
docs:build    # build estático del sitio de documentación
docs:preview  # sirve el build
```

---

## Decisiones abiertas / riesgos

- **Empaquetado del simulador:** en v1 se exporta desde el mismo proyecto (`index.ts`). Si se quiere usar de forma totalmente independiente, podría extraerse a un paquete propio.
- **Persistencia / compartir:** fuera de v1. Si se aborda, la vía preferida es **codificar el estado en la URL** (sin servidor), no `localStorage`.