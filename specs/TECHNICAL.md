# CPUSchedulerSimulator — Decisiones técnicas

> **El objetivo del proyecto es un módulo reutilizable** (paquete de JavaScript/TypeScript) que implementa el **simulador + el componente** y que se puede instalar como una **dependencia** (`npm install`). El sitio de documentación es un subproyecto en `docs/` (Astro + Starlight) que documenta y demuestra el módulo; la web no es el fin.
> Convención: **todos los identificadores del código (tipos, campos, métodos, archivos y carpetas) están en inglés**; la prosa de los documentos está en español.
> Se añade una **capa de servidor** (backend) para persistir, compartir, colaborar y exportar; el núcleo de simulación sigue siendo puro y funciona sin servidor.
---

## Arquitectura: tres capas desacopladas

La dependencia va en **una sola dirección**: **demo → componente → simulador**. Nunca al revés. El valor (el simulador) no queda atado a una vista.

1. **Simulador (`src/core`)** — toda la lógica. TypeScript puro, **sin React ni DOM**. Usable desde cualquier librería de interfaz o desde un script de Node. Incluye el subsistema de E/S (solo para VRR) y `runFrom` (what-if).
2. **Componente React (`src/react`)** — **consume** el simulador y **renderiza** los resultados. Añade edición (`ProcessForm`, `AlgorithmParamsForm`) y persistencia por sesión (`sessionStorage`).
3. **Documentación (`docs/`)** — subproyecto Astro + Starlight: documentación para desarrolladores (cómo usar, configurar y crear algoritmos) que embebe el componente como isla, con un ejemplo de uso por algoritmo.

---

## Stack

**Proyecto principal (componente + simulador):**

- **Simulador:** TypeScript puro, sin dependencias de interfaz ni del navegador (agnóstico).
- **Componente:** React. Consume el simulador, renderiza la interfaz y gestiona el estado local.
- **Persistencia de sesión:** Implementada en la capa de React. El escenario actual (procesos, algoritmo y parámetros) se guarda en el `sessionStorage` del navegador. Funciona sin servidor y los datos se descartan automáticamente al cerrar la pestaña.
- **Build:** se construye y se publica como **librería** (Vite en modo lib o `tsup`). **Astro no interviene en el proyecto principal.**
- **Vitest** (simulador) y **Testing Library** (componente).

**Subproyecto de documentación (`docs/`):**

- **Astro** con **Starlight**. Documentación para desarrolladores: cómo usar el componente, cómo configurarlo, y cómo crear un algoritmo (`IAlgorithm`) indicando dónde se deben modificar sus configuraciones.
- **Ejemplos en vivo (Islas React):** Una página `.mdx` por cada algoritmo que embebe el componente interactivo. Al renderizar el componente, estas páginas de demostración heredan automáticamente la funcionalidad de persistencia en `sessionStorage`.
- **Vive en el mismo repositorio**, como subdirectorio `docs/` con su propio `package.json`.
- **La documentación se mantiene al día con el código:** cada funcionalidad o algoritmo actualiza su página en `docs/` en el mismo cambio.

---

## Estructura del proyecto

```
/                              # proyecto principal = módulo (simulador + componente)
  src/
    core/                      # TypeScript puro. Sin DOM, sin React, sin Astro.
      types/
        process.ts             # Process
        scheduler-state.ts     # SchedulerState
        io.ts                  # IOOperation, DeviceState (solo VRR)       (v2)
        algorithm.ts           # IAlgorithm + ReadyProcess + PreemptionTrigger + SchedulerEvent
        history.ts             # HistoryEvent(+ E/S para VRR), History, Interval
        simulation-result.ts   # SimulationResult, ProcessMetrics, AggregateMetrics
      registry.ts              # registro de algoritmos por name
      simulate.ts              # fachada pública: run(scenario) + runFrom(state) + reexport de derive/
      engine/                  # mecánica del motor (aislada de la fachada)
        loop.ts                # bucle por ticks (executeSimulationLoop) + helpers de selección
        validate.ts            # validateProcesses()
      derive/                  # derivaciones puras del history (al final de run())
        intervals.ts           # deriveIntervals()
        metrics.ts             # deriveMetrics()
      io-subsystem.ts          # subsistema E/S de VRR (mecánica) 
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
          virtual-round-robin.ts
          multilevel-feedback.ts
    react/                     # componente (islas React)
      SimulationProvider.tsx
      GanttChart.tsx
      ProcessTable.tsx
      PlaybackControls.tsx     # ÚNICO sitio con deltaTime / requestAnimationFrame
      MetricsTable.tsx
      ProcessForm.tsx          # panel desplegable: todos los procesos con campos
                               # editables, abierto por defecto, rederivar botónn de Simular
      AlgorithmParamsForm.tsx  # editar quantum/quanta/boostInterval + botón Aplicar
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
      virtual-round-robin.mdx
      multilevel-feedback.mdx
  astro.config.mjs
  package.json                 # depende del módulo
  tsconfig.json                # extends astro/tsconfigs/strictest
```

---

## Modelo de E/S (solo para algoritmos con `requires.io`)

La E/S es un subsistema del **motor**, no del algoritmo. Solo se activa cuando el algoritmo declara `requires.io = true` (**ÚNICAMENTE Round Robin Virtual**). Los demás, incluido `mlfq`, son estrictamente de CPU: su `SchedulerState`/`HistoryEvent` no llevan estado de E/S.

**Contención:** hay **un único dispositivo de E/S** (`device` por defecto). Sirve a **un proceso a la vez**. Cuando un proceso alcanza su `io_entry`:
- si el dispositivo está **libre**, entra directo a servicio;
- si está **ocupado** (sirviendo a otro proceso, sea desde este mismo tick o desde varios ticks antes), entra al final de la **cola FCFS** del dispositivo y espera su turno.

Si **dos o más procesos** alcanzan su `io_entry` en el **mismo tick** y el dispositivo está libre, el motor decide a cuál admite primero por el desempate global (menor `arrival_time` y, si persiste, menor `id`); el resto entra en la cola. La cola puede acumular **más de un proceso** mientras el dispositivo sigue ocupado a lo largo de varios ticks, no solo en el caso de empate exacto.

```ts
// types/io.ts
interface IOOperation {
  readonly io_entry: number;   // CPU acumulada ejecutada antes de bloquearse (>0, <burst_time)
  readonly io_time: number;    // duración del servicio (>0)
  readonly device?: string;    // dispositivo destino; por defecto el único
}                              // io_exit es DERIVADO (no se almacena en la entrada)

// UN único dispositivo; el campo `device` en IOOperation queda reservado
// para una extensión futura a varios dispositivos, sin tocar este tipo.
interface DeviceState {
  readonly id: string;
  readonly serving: string | null;     // pid en servicio
  readonly remaining: number;          // ticks de servicio restantes
  readonly queue: readonly string[];   // cola FCFS de pids esperando
}
```

```ts
// types/process.ts
interface Process {
  readonly id: string;
  readonly arrival_time: number;       // >= 0
  readonly burst_time: number;         // > 0  (demanda total de CPU)
  readonly priority?: number;
  readonly io?: readonly IOOperation[]; // io_entry estrictamente crecientes; solo io algos
}
```

```ts
// types/scheduler-state.ts
interface SchedulerState {
  readonly tick: number;
  readonly onCPU: string | null;
  readonly ready: readonly string[];
  readonly pending: readonly string[];
  readonly completed: readonly string[];
  readonly devices?: readonly DeviceState[];  // ausente/[] en algoritmos clásicos
 
}
```

`io-subsystem.ts` posee la mecánica de dispositivos: avanzar servicios, admitir cabezas de cola (FCFS), devolver a `ready` al terminar. Es puro y determinista (sin `Math.random`/`Date.now`).

---
## Contrato del algoritmo (`IAlgorithm`)

Es el **único punto de acoplamiento** entre un algoritmo y el simulador. Cada algoritmo va en **su propia clase**, implementa este contrato y **no accede a los internos del motor** (ni al history, ni a las metrics, ni al `Player`, ni al tipo de estado interno).

```ts
// types/algorithm.ts

export interface ReadyProcess {
  readonly id: string;
  readonly arrival_time: number;
  readonly burst_time: number;
  readonly remaining: number;
  readonly priority?: number;
}

// ── Modo de expropiación ───────────────────────────────────────────────────
// Cada algoritmo declara su conjunto de disparadores. El motor los usa para saber
// CUÁNDO llamar a select() y si debe expropiar al proceso en CPU.

type PreemptionTrigger =
  | 'on-tick'        // reevalúa select() cada tick; expropia si cambia el elegido (SRTF, Prio-P)
  | 'on-arrival'     // reevalúa cuando llega un proceso nuevo (MLFQ)
  | 'on-io-return'   // reevalúa cuando un proceso vuelve de E/S (VRR, MLFQ)
  | 'on-quantum'     // expropia al agotar el slice de quantumFor()/config.quantum (RR, VRR, MLFQ)
  | 'on-boost';      // reevalúa en un priority-boost (MLFQ)
// Conjunto vacío {} = no expropiativo (FCFS, SJF, LJF, Prioridad NP).

// ── Eventos del motor → algoritmo ──────────────────────────────────────────
// El motor emite estos eventos vía onEvent() para que el algoritmo mantenga
// su estado interno (colas, niveles, sobrante). El algoritmo los RECIBE,
// nunca los genera.

type SchedulerEvent =
  | { readonly type: 'arrival';        readonly id: string; readonly tick: number }
  | { readonly type: 'dispatch';       readonly id: string; readonly tick: number;
      readonly slice: number | null }
  | { readonly type: 'quantum-expiry'; readonly id: string; readonly tick: number;
      readonly ranFor: number }
  | { readonly type: 'preempted';      readonly id: string; readonly tick: number;
      readonly ranFor: number }
  | { readonly type: 'io-start';       readonly id: string; readonly tick: number;
      readonly ranFor: number; readonly device: string }
  | { readonly type: 'io-return';      readonly id: string; readonly tick: number }
  | { readonly type: 'completed';      readonly id: string; readonly tick: number }
  | { readonly type: 'priority-boost'; readonly tick: number;
      readonly ids: readonly string[] };


interface IAlgorithm {
  readonly name: string;
  readonly triggers: ReadonlySet<PreemptionTrigger>; // disparadores: CUÁNDO reevaluar/expropiar
  readonly requires: { priority?: boolean; quantum?: boolean; io?: boolean; levels?: boolean };
  select(ready: readonly ReadyProcess[]): ReadyProcess;
  quantumFor?(p: ReadyProcess): number | null;       // quantum variable (sobrante / nivel)
  onEvent?(e: SchedulerEvent): string | null;
  levelSnapshot?(): Readonly<Record<string, number>>; // pid → nivel/cola (solo multinivel)
}
```
### Qué hace cada campo

| Campo | Obligatorio | Quién lo usa | Para qué |
|-------|:-----------:|:------------:|----------|
| `name` | sí | registro | identificar el algoritmo (`'fcfs'`, `'mlfq'`, etc.) |
| `triggers` | sí | motor | conjunto declarativo de disparadores (`on-tick`, `on-arrival`, `on-io-return`, `on-quantum`, `on-boost`) que define CUÁNDO el motor reevalúa `select()` y si expropia. Conjunto vacío = no expropiativo |
| `requires` | sí | motor + UI | validar la config y mostrar/ocultar campos en la demo. `levels: true` (solo MLFQ) indica a `AlgorithmParamsForm` que renderice un quantum **por nivel** (2 campos: `quanta[0]`, `quanta[1]`) más `boostInterval`, en vez de un único `quantum` |
| `select()` | sí | motor | elegir qué proceso ocupa la CPU |
| `quantumFor()` | no | motor | saber cuánto dura el turno de un proceso concreto |
| `onEvent()` | no | motor | notificar al algoritmo + obtener el motivo rico |

### Patrón 1: Algoritmos Sin Estado (Clásicos)
Algoritmos que toman decisiones basadas puramente en la `readyQueue` actual, sin memoria de eventos pasados. Solo implementan `name`, `triggers`, `requires` y `select()`. Está prohibido implementar métodos opcionales (`quantumFor`, `onEvent`, `levelSnapshot`).

```ts
// Prioridad expropiativa — idéntico a v01, sin cambios
export class PriorityP implements IAlgorithm {
  readonly name = 'priority-p';
  readonly triggers = new Set<PreemptionTrigger>(['on-tick']);
  readonly requires = { priority: true as const };

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    let best = ready[0]!;
    for (const p of ready) {
      if ((p.priority ?? Infinity) < (best.priority ?? Infinity)) best = p;
    }
    return best;
  }
}
```
### Patrón 2: Algoritmos Con Estado Interno (Complejos)
Algoritmos que mantienen estructuras de datos internas (colas multinivel, tiempos sobrantes) o reaccionan a interrupciones (E/S). Utilizan los métodos opcionales `quantumFor` y `onEvent`. El motor no tiene acceso a este estado interno.
```ts
// VRR — esquema, no implementación completa
export class VirtualRoundRobin implements IAlgorithm {
  readonly name = 'virtual-round-robin';
  readonly triggers = new Set<PreemptionTrigger>(['on-quantum', 'on-io-return']);
  readonly requires = { quantum: true, io: true } as const;

  // Estado interno (el motor no lo ve)
  private readonly mainQueue = new FifoQueue<string>();
  private readonly auxQueue = new FifoQueue<string>();
  private readonly remainingSlice = new Map<string, number>();

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    // auxQueue tiene prioridad sobre mainQueue
    const nextId = !this.auxQueue.isEmpty
      ? this.auxQueue.peek()
      : this.mainQueue.peek();
    return ready.find(p => p.id === nextId)!;
  }

  quantumFor(p: ReadyProcess): number {
    // Desde auxQueue → sobrante; desde mainQueue → quantum completo
    return this.remainingSlice.get(p.id) ?? this.quantum;
  }

  onEvent(e: SchedulerEvent): string | null {
    switch (e.type) {
      case 'arrival':
        this.mainQueue.enqueue(e.id);
        return null;                          // frase genérica del motor
      case 'io-return':
        this.auxQueue.enqueue(e.id);
        const s = this.remainingSlice.get(e.id) ?? 0;
        return `entra en la cola auxiliar con sobrante de ${s}`;
      case 'quantum-expiry':
        this.mainQueue.enqueue(e.id);
        return 'se reencola en la cola principal';
      // ... otros eventos
      default:
        return null;
    }
  }
}
```

La clase puede tener miembros propios adicionales el contrato solo exige lo anterior. **El motor** (la mecánica del bucle vive en `engine/loop.ts`; `simulate.ts` es solo la fachada que lo orquesta) posee la mecánica; el algoritmo solo aporta la **política de selección**:

El algoritmo declara su conjunto de **disparadores** (`triggers`) y el motor reacciona a ellos con una única rutina genérica de reselección:

```ts
type PreemptionTrigger =
  | 'on-tick'       // reevaluar cada tick (SRTF, Prioridad expropiativa)
  | 'on-arrival'    // reevaluar cuando llega un proceso nuevo
  | 'on-io-return'  // reevaluar cuando un proceso vuelve de E/S
  | 'on-quantum'    // ceder la CPU al agotar el quantum
  | 'on-boost';     // reevaluar en un priority-boost
```

| Algoritmo(s) | `triggers` | Comportamiento |
|---|---|---|
| FCFS, SJF, LJF, Prioridad NP | `{}` | el motor pide selección solo cuando la CPU queda libre |
| SRTF, Prioridad expropiativa | `{ on-tick }` | reevalúa cada tick y expropia si `select()` devuelve otro proceso |
| Round Robin | `{ on-quantum }` | expropia al agotar el `quantum`; `select()` es FIFO |
| Round Robin Virtual | `{ on-quantum, on-io-return }` | reevalúa al retornar de E/S; `select()` prioriza la cola auxiliar |
| MLFQ | `{ on-quantum, on-arrival, on-io-return, on-boost }` | combina tiempo, llegadas, retorno de E/S y priority-boost |

El motor entrega `ready` ya ordenado por el desempate global (`arrival_time`, luego `id`); cada algoritmo solo aplica su criterio principal.

> **Nota:** `on-quantum` solo inicia una cuenta de expiración si hay fuente de quantum (`quantumFor()` o `config.quantum`); en Round Robin Virtual el quantum es opcional, así que sin fuente no se inicia. Añadir un algoritmo con una combinación nueva de disparadores **no exige tocar el motor**: basta declarar su `Set`. La historia de esta decisión (sustitución del antiguo enum `PreemptionMode`) está en los ADR `28-06-2026` de `DECISIONS.md`.

### Mensajes ricos — cómo `onEvent` alimenta `HistoryEvent.message`

El campo `HistoryEvent.message` ya existía en v01 con frases genéricas del motor ("P1 entra en CPU", "CPU inactiva"). En v02, el mensaje se enriquece con la mecánica interna del algoritmo, **sin añadir tipos nuevos al contrato**:

1. El motor resuelve el tick y emite cada `SchedulerEvent` vía `onEvent()`.
2. Si `onEvent` devuelve un **string** (p. ej. `"se degrada al nivel 1"`), el motor lo
   combina con su propia información (pid, tick) para componer el `message` final.
3. Si devuelve **null**, el motor usa su frase genérica de siempre.

Ejemplos de lo que devuelve `onEvent` en cada algoritmo:

| Algoritmo | Evento | `onEvent` devuelve |
|-----------|--------|--------------------|
| FCFS/SJF/etc. | cualquiera | no implementa `onEvent` → `null` → frase genérica |
| Round Robin | `quantum-expiry` | `"se reencola"` (o `null`, la frase genérica ya lo dice) |
| VRR | `io-return` | `"entra en la cola auxiliar con sobrante de 2"` |
| VRR | `dispatch` | `"desde la cola auxiliar (sobrante 2)"` o `"desde la cola principal"` |
| MLFQ | `quantum-expiry` | `"se degrada al nivel 1"` |
| MLFQ | `preempted` | `"llega al nivel 0"` |
| MLFQ | `priority-boost` | `"todos los procesos suben al nivel 0"` |

El motor entrega `ready` ya ordenado por el desempate global (`arrival_time`, luego `id`);
cada algoritmo solo aplica su criterio principal.

> No es un `simulate(processes, config): Result`: eso obligaría a cada algoritmo a reimplementar la lógica del simulador y mezclarse con ella. La política lo mantiene desacoplado.
---

## Contrato del historial (`History`)

```ts

interface HistoryEvent {
  readonly tick: number;
  readonly onCPU: string | null;            
  readonly ready: readonly string[];
  readonly pending: readonly string[];
  readonly completed: readonly string[];
  readonly inIO: string | null;             // pid en servicio en el dispositivo, o null
  readonly waitingIO: readonly string[];    // cola FCFS del dispositivo
  readonly message: string;
  readonly levels?: Readonly<Record<string, number>>; // pid → nivel/cola del tick (solo MLFQ);
                                            // el motor lo copia de algo.levelSnapshot() para anotar el Gantt
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
  - `src/core/algorithms/**` solo importa el contrato (`types/algorithm.ts`), nunca `simulate.ts`, `engine/**`, `derive/**`, `player.ts` ni otros internos del motor.
  - `src/react/**` puede importar `src/core`, pero `src/core` **nunca** importa React.

---

## Plan de implementación paso a paso

> El desglose en tareas atómicas está en `specs/PLAN.md`. Orden de abajo arriba
> (simulador → componente → documentación). Cada fase que añade funcionalidad o un
> algoritmo actualiza su documentación en `docs/` en el mismo cambio.
>
> **Ya no hay "Fases v2" separadas.** Los tipos de E/S, el subsistema de E/S, VRR, MLFQ
> y la rederivación están integrados en las fases correspondientes desde el principio.

- **Fase 0 — Andamiaje:** proyecto principal + subproyecto `docs/`; TypeScript estricto,
  ESLint con fronteras, Vitest.
- **Fase 1 — Tipos y contratos:** todos los tipos con su forma final v02: `Process`,
  `IOOperation`, `DeviceState`, `SchedulerState`, `IAlgorithm`/`ReadyProcess`/
  `PreemptionTrigger`/`SchedulerEvent`, `History`/`HistoryEvent`/`Interval`,
  `SimulationResult`, `Scenario`, `WhatIfBranch`.
- **Fase 2 — Registro:** registrar y obtener algoritmos por `name`.
- **Fase 3 — Motor y E/S (`simulate.ts` + `io-subsystem.ts`):** bucle por ticks,
  desempate global, `select()` según los `triggers` del algoritmo, subsistema de E/S
  (dispositivo único con contención FCFS), mensajes ricos (`onEvent` → narrativa
  compuesta), derivación pura de `intervals` y `metrics`, `runFrom()` para what-if e
  inyección en vivo, validación y casos límite.
- **Fase 4 — Player (`player.ts`):** cursor sobre el `history` con límites.
- **Fase 5 — Algoritmos (los 9), uno a uno con su test:**

| Algoritmo              | `triggers`                                        | `select` elige…                            |
|------------------------|---------------------------------------------------|--------------------------------------------|
| FCFS                   | `{}`                                              | menor `arrival_time`, sino menor `id`      |
| SJF                    | `{}`                                              | menor `remaining`                          |
| LJF                    | `{}`                                              | mayor `burst_time`                         |
| Prioridad (NP)         | `{}`                                              | menor `priority`                           |
| SRTF                   | `{ on-tick }`                                     | menor `remaining`                          |
| Prioridad (P)          | `{ on-tick }`                                     | menor `priority`                           |
| Round Robin            | `{ on-quantum }`                                  | FIFO                                       |
| Round Robin Virtual    | `{ on-quantum, on-io-return }`                    | `auxQueue` → `mainQueue`; slice = sobrante |
| MLFQ                   | `{ on-quantum, on-arrival, on-io-return, on-boost }` | nivel no vacío de menor índice          |

  Todos declaran `requires.io = false` excepto VRR (`requires.io = true`).

- **Fase 6 — Componente React (`src/react`):** tokens visuales, `SimulationProvider`
  (estado + API what-if), `SimulationApp` (contenedor visual), `GanttChart`,
  `ProcessTable`, `PlaybackControls`, `MetricsTable`, `ProcessForm`, `AlgorithmParamsForm`,
  `WhatIfControls`.
- **Fase 7 — Persistencia por sesión:** `sessionStorage` con clave por algoritmo
  (escenario base + rama what-if por separado).
- **Fase 8 — Documentación (`docs/`):** guías (integración, configuración, crear
  algoritmo) y una página de demo por algoritmo que embebe el componente.
- **Fase 9 — Estética:** revisión visual con tokens de diseño, consistencia y contraste. Incluye el rediseño del `GanttChart` como tabla (cabecera de ticks y columna de procesos en superficie elevada, bordes de rejilla, scroll horizontal, etiquetas «CPU»/«E/S» dentro de la celda, estados de E/S en color de aviso, tipografía monoespaciada) e iconos SVG nativos en los controles. El motivo de este rediseño está en el ADR correspondiente de `DECISIONS.md`.
- **Fase 10 — Verificación final:** cobertura de `BEHAVIOURSv-02.md`, typecheck, lint
  limpio, build de producción.


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

## Funcionamiento de los algoritmos (paso a paso)

> Detalle de la **política** de cada algoritmo nuevo. La **mecánica** (tiempo, E/S, history, métricas) la pone el motor; aquí se describe lo que decide la clase del algoritmo.

### Round Robin Virtual (`virtual-round-robin.ts`, `name: 'rrv'`)

Modela E/S (`requires.io = true`). Mantiene **dos colas FIFO** —principal y auxiliar— y un **sobrante** por proceso; la auxiliar tiene prioridad. **Identificadores de código (inglés):**
- `mainQueue: FifoQueue<string>` (la principal, round robin, priorida 1 )
- `auxQueue: FifoQueue<string>` (la auxiliar, fcfs, prioridad 0)
- `remainingSlice: Map<string, number>` (el sobrante por `pid`).

1. Una **llegada nueva** entra al final de la cola **principal** (`mainQueue`).
2. Un proceso que **agota el quantum** sin bloquearse ni completar vuelve al final de la **prioridad 1** (`mainQueue`).
3. Un proceso que **se bloquea por E/S antes de agotar el quantum**: al volver de la E/S entra al final de la cola **auxiliar** (`auxQueue`) y se recuerda su **sobrante** (`remainingSlice.set(pid, quantum − ticks ejecutados)`) en ese turno. 
  - Si se bloqueó justo al agotar el quantum, sobrante = 0 → entra en la **prioridad 1**, sino(else) en la auxiliar **prioridad 0**
4. **Selección (`select`):** si `auxQueue` no está vacía, su cabeza; si no, la cabeza de `mainQueue`. FIFO dentro de cada cola.
5. **Duración del turno (`quantumFor`):** desde `auxQueue`, el **sobrante** (`remainingSlice.get(pid)`); desde `mainQueue`, el **quantum** completo. Si un proceso de `auxQueue` no completa en su sobrante, pasa a `mainQueue`.
6. Sí expropia al proceso en CPU cuando aparece un retorno de E/S (`triggers` incluye `'on-io-return'`). Si la CPU está ejecutando un proceso proveniente de la `mainQueue` (prioridad 1) y un proceso termina su E/S ingresando a la `auxQueue` (prioridad 0), el proceso en ejecución es interrumpido de inmediato y devuelto a la `mainQueue`, permitiendo que el proceso recién llegado a la auxQueue tome el control de la CPU en ese mismo tick.

Estado interno (vía `onEvent`): `mainQueue`, `auxQueue` y `remainingSlice`. `io-start` / `quantum-expiry` actualizan `remainingSlice`; `io-return` mete el proceso en `auxQueue`. `validateParams`: `quantum` entero `> 0`. **(v2)** `paramSchema`: un campo `integer` (`key:'quantum'`, `min: 1`) → editable desde la demo vía `AlgorithmParamsForm`. **(v2)** `reasonFor`:en `io-return` devuelve `{ text: "se inserta en la cola auxiliar con sobrante de ${remainingSlice.get(id)}" }`; en `dispatch` devuelve `{ text: "desde la cola auxiliar (sobrante ${remainingSlice.get(id)})" }` si `id` viene de `auxQueue`, o `{ text: "desde la cola principal" }` si viene de `mainQueue`; en `quantum-expiry` devuelve `{ text: "se reencola en la cola principal" }` (mensaje rico — ver § Mensajes ricos más abajo).


### Cola de realimentación — MLFQ (`multilevel-feedback.ts`, `name: 'mlfq'`)

**Solo CPU** (`requires.io = false`). **3 niveles fijos:**

| Nivel | Política | Quantum |
|-------|----------|---------|
| 0 (mayor prioridad) | Round Robin | `quanta[0]` (editable) |
| 1 | Round Robin | `quanta[1]` (editable) |
| 2 (menor prioridad) | FCFS | — (sin quantum; **run-to-completion**: una vez en CPU, ejecuta hasta completar) |


El número de niveles **no es configurable**; `quanta` es siempre un array de exactamente
2 enteros `> 0`.

Mantiene una cola FIFO por nivel (`levels`) y el mapa `processLevel` (`pid → índice de
nivel`, nivel 0 = mayor prioridad). **Identificadores de código (inglés):**
`levels: [FifoQueue<string>, FifoQueue<string>, FifoQueue<string>]` — siempre 3 colas;
y `processLevel: Map<string, number>` (`pid → 0 | 1 | 2`).

1. Una **llegada nueva** entra al **nivel 0** (`levels[0]`).
2. **Selección (`select`):** la cabeza de `levels[i]` para el menor `i` tal que `levels[i]` no esté vacío; dentro del nivel, FIFO. **Excepción (no expropiación por llegada):** si hay un proceso en CPU (`currentCpuPid`) y sigue listo, `select` lo devuelve siempre. Una llegada nunca expropia al proceso en ejecución.
3. **Duración del turno (`quantumFor`):** `quanta[processLevel.get(pid)]` para niveles 0 y 1. Para nivel 2 devuelve `0` — el motor, por la guarda `currentSlice > 0`, no aplica expiración de quantum (run-to-completion). (`0` ≠ `null`: `null` significaría "usa `config.quantum`", como en VRR; `0` significa "sin expiración".)
4. Un proceso que **agota el quantum** de su nivel sin completar se **degrada**:
   - Desde nivel 0 → nivel 1 (Round Robin con `quanta[1]`).
   - Desde nivel 1 → nivel 2 (FCFS; ya no expira por quantum).
   - En nivel 2 → se queda en nivel 2 (no se degrada más).
5. **Expropiación SOLO por quantum (no por llegada):** mientras un proceso ejecuta en los niveles 0/1, las llegadas se encolan en `levels[0]` y **esperan**; el proceso conserva la CPU hasta agotar su quantum. Al agotarlo se degrada y, con la CPU libre, `select` elige el `levels[i]` no vacío de menor índice — típicamente el proceso del nivel 0 que estaba esperando. El nivel 2 es **run-to-completion** (no se expropia nunca). El modo del motor sigue siendo `'on-quantum-and-better'` (la mitad "better" solo se activa en el *priority boost*, no en las llegadas).
6. **Envejecimiento — *priority boost*:** cada `boostInterval` ticks (si se configura), **todos** los procesos se mueven a `levels[0]` (`processLevel.set(pid, 0)` para todos), reseteando la degradación; evita la inanición. Incluye al proceso en CPU si está en nivel 0 o 1: sube a nivel 0 y se **reevalúa `select()`** de inmediato. **Excepción:** si el proceso en CPU está en el nivel 2, el boost NO lo afecta (conserva la CPU y su nivel; run-to-completion). Empate al reencolar tras el boost: por menor `id`. Sin `boostInterval` no hay boost.

**Estado Interno y Parámetros:**
- `validateParams`: `quanta` array de exactamente 2 enteros `> 0`; `boostInterval`, si está, entero `> 0`.
- **Edición desde la demo** (`AlgorithmParamsForm`): MLFQ declara `requires.levels = true`, lo que hace que el formulario renderice **dos campos `integer`** para los quanta por nivel (`Quantum nivel 0` → `quanta[0]`, `Quantum nivel 1` → `quanta[1]`, ambos `min: 1` y obligatorios) **y** un campo `integer` opcional (`Boost interval` → `boostInterval`, `min: 1`). Si se deja `boostInterval` vacío, equivale a omitirlo (sin *priority boost*), no a un error de validación. El formulario emite `params.quanta = [q0, q1]`, que `SimulationProvider.buildConfig` propaga a `RunConfig.quanta` y el motor pasa a la fábrica de MLFQ vía `get(name, params)`.

**§ Mensajes Ricos y Narrativa Compuesta :**
`onEvent` devuelve fragmentos concatenables `{ text: string } | null`:
- `quantum-expiry`: `{ text: "se degrada al nivel ${nuevoNivel}" }` (con el nuevo
  nivel, ya incrementado).
- `preempted`: `{ text: "es expropiado porque un proceso llega al nivel 0" }`.
- `priority-boost`: `{ text: "Priority boost: todos suben al nivel 0" }`.
- `dispatch`: `{ text: "toma la CPU desde el nivel ${nivel}" }`.

---

## `ProcessForm` — implementación


**Cableado con el motor:** cada cambio de campo válido dispara
`SimulationProvider.run()` (o `runFrom()` si el reproductor está a mitad). Si el valor es inválido, se marca el campo con error y **no se rederiva**. No hay estado `draft` separado del `applied` (a diferencia de `AlgorithmParamsForm`): el estado del formulario **es** el escenario actual en el contexto de React.

**Panel abierto por defecto.** Un control toggle lo cierra/abre.

**Añadir proceso:** valores por defecto (`arrival_time: 0`, `burst_time: 1`, `id` autoincremental, lista `io` vacía) → rederiva. **Eliminar proceso:** rederiva al instante; si queda vacío → estado vacío sin error.

**Inyección en vivo:** si `arrival_time ≥ tick_actual` → `runFrom(state_at_T)`. Si `arrival_time < tick_actual` → error en el campo, sin rederivación.

**Campos condicionales:**
- `priority`: solo si `requires.priority`.
- `io_exit`: derivado, no editable (se muestra en `ProcessTable`).


### Edición de operaciones de E/S (solo si `requires.io`)

Cuando el algoritmo activo es Round Robin Virtual, cada proceso del formulario muestra su lista de operaciones de E/S como una **sublista editable** dentro de la fila del proceso. Cada operación expone dos campos: `io_entry` (entero) e `io_time` (entero).

**Estructura de la sublista:** 
Proceso P1 [id] [arrival_time] [burst_time]
                                          └─ Operación 1: [io_entry] [io_time]  [✕ eliminar]
                                          └─ Operación 2: [io_entry] [io_time]  [✕ eliminar]
                                          └─ [+ Añadir operación de E/S]
**Añadir operación:** un control por proceso; añade al final de la lista con valores
por defecto (`io_entry` = menor valor válido disponible, `io_time: 1`). Rederiva si
los valores resultan válidos.

**Eliminar operación:** un control por operación; elimina de la lista y rederiva al
instante. Si se eliminan todas, el proceso queda sin E/S (solo CPU dentro de VRR).

**Validación por operación (campo a campo):**
| Campo | Regla | Error si |
|-------|-------|----------|
| `io_entry` | entero `> 0` y `< burst_time` | `≤ 0` o `≥ burst_time` |
| `io_time` | entero `> 0` | `≤ 0` |

**Validación entre operaciones (lista completa):**
- Los `io_entry` deben ser **estrictamente crecientes**: `io[n].io_entry < io[n+1].io_entry`.
  Si al editar un valor se rompe el orden, error en el campo que viola.
- **Cascada con `burst_time`:** si el usuario reduce `burst_time` y algún
  `io_entry ≥ burst_time`, se señala error en cada operación afectada.

En ambos casos de error, la simulación **no rederiva** hasta corregirlo.

**No usa `sessionStorage` directamente.** El estado vive en el contexto de React; la persistencia la gestiona el `SimulationProvider`.

---

## `AlgorithmParamsForm` — implementación

Lee `algorithm.paramSchema` y renderiza un campo por entrada. Si `paramSchema` está vacío o ausente, no se monta. Si tiene entradas, se monta **visible desde el primer render** con valores iniciales del escenario.

**Estado `draft` vs `applied`:** el formulario mantiene `draft` (lo que el usuario edita) separado de `applied` (los `params` con los que se simuló). Mientras `draft !== applied`, los campos se marcan pendientes. La simulación mostrada sigue siendo la de `applied` → **no rederiva tecla a tecla**. Al pulsar "Aplicar": llama a `algorithm.validateParams(draft)`; si devuelve un string → muestra error, `applied` no cambia; si devuelve `null` → `applied = draft`, dispara `run`/`runFrom`.

Cambiar el algoritmo activo resetea `draft` al `paramSchema`/valores del algoritmo entrante.

---

## Mensajes ricos — mecanismo de ensamblado

`HistoryEvent.message` sigue siendo un **string único**. El motor es el único que lo escribe. El mecanismo simplificado:

1. El motor resuelve el tick y emite `SchedulerEvent` vía `onEvent()`.
2. `onEvent` devuelve `string | null`. Si devuelve un string (p. ej. `"se degrada al nivel 1"`), el motor lo incorpora al mensaje del tick. Si devuelve `null`, el motor usa su frase genérica (`"P2 entra en CPU"`, `"CPU inactiva"`).
3. El motor decide el fraseo final; el algoritmo solo aporta el fragmento de motivo.
4. Si hay varios eventos en un tick, se concatenan en el orden intra-tick (io-return → llegadas → quantum), separados por ". ".

**Sin `reasonFor`, sin `AlgorithmReason`:** el motivo sale directamente del `string | null` de `onEvent`. Un solo canal para estado interno + mensaje rico.

---

## Motor (`simulate.ts` + `engine/` + `derive/`)

> `simulate.ts` es la **fachada pública** (`run`/`runFrom`); la mecánica del bucle por ticks está aislada en `engine/loop.ts` (con la validación en `engine/validate.ts`), y las derivaciones puras en `derive/intervals.ts` y `derive/metrics.ts`. `simulate.ts` reexporta `deriveIntervals`/`deriveMetrics` para mantener la API pública estable.

- **`run(scenario): SimulationResult`** — bucle por ticks. Para clásicos: ruta de CPU pura (idéntica a v01). Para algoritmos con E/S: además avanza `io-subsystem`.
- **`runFrom(state, algorithm, params): SimulationResult`** — rederivación para *what-if*: toma un `SchedulerState` como condición inicial y simula hacia delante. Determinista.
- **Inyección en vivo:** añadir un proceso con `arrival_time ≥ tick` y rederivar desde ese tick (caso de `runFrom`).
- **Orden intra-tick:** consumo de CPU y servicios de E/S → fin de tramo de CPU (completar / iniciar E/S) → fin de servicio de E/S (vuelve a `ready`; dispositivo admite cabeza de cola) → inserciones en `ready`: **io-return → llegadas → reencolado por quantum** (cada grupo por `id`) → decisión de reparto.
- **Empate ráfaga/quantum:** si coinciden fin de tramo y expiración de quantum, manda el fin de tramo (bloqueo/finalización).

`intervals` y `metrics` se **derivan** del `history` con funciones puras. 
`waiting = turnaround − CPU_total − blocked_total` (en clásicos `blocked_total = 0`).

---

## Escenario y persistencia por sesión

```ts
// types/scenario.ts
interface Scenario {
  readonly name?: string;
  readonly processes: readonly Process[];
  readonly algorithm: string;
  readonly params: AlgorithmParams;
  readonly whatIf?: { fromTick: number; state: SchedulerState };
}
```

- **Persistencia:** `sessionStorage` del navegador; al recargar dentro de la misma pestaña se restaura. Se pierde al cerrar la pestaña; no se comparte entre pestañas.
- **Clave por página:** `scheduler-scenario:${algorithmName}`. Navegar entre páginas no borra ni mezcla claves.
- El **resultado de la simulación no se persiste:** se rederiva del escenario al cargar.

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