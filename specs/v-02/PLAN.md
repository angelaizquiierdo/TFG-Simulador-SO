# Plan de Implementación — CPUSchedulerSimulator v02

> Hoja de ruta secuencial. Cada tarea es atómica: tiene un resultado verificable y sus
> tests pasan antes de continuar con la siguiente.
>
> Fuentes: `SPECv-02.md` · `BEHAVIOURSv-02.md` · `TECHNICAL.md` · Ubicación: `specs/v-02/PLAN.md`
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
         src/core/engine \
         src/core/derive \
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
  eslint-plugin-react-hooks \
  react react-dom @types/react @types/react-dom
```

Luego crear y configurar:

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
  - `src/core/algorithms/**` solo importa `types/algorithm.ts`, `types/io.ts` 
  - `src/react/**` puede importar `src/core`, nunca al revés

**Nota sobre `priority?`:** `exactOptionalPropertyTypes` prohíbe asignar `undefined` explícitamente. Usar spread condicional: `...(val !== undefined ? { prop: val } : {})`.

**Verificación:** `typecheck`, `lint` y `test --passWithNoTests` pasan en vacío; un `import` prohibido de React desde core hace fallar el lint.

---

### T-01 · Crear el subproyecto `docs/` (Astro + Starlight)

Archivos: `docs/astro.config.mjs`, `docs/package.json`, `src/react/style/tokens.css`.

```bash
npm create astro@latest docs -- --template starlight
cd docs && npx astro add react && cd ..
npm install
```
**Estructura y Configuración Principal:**
Configurar `docs/astro.config.mjs` estableciendo el alias de desarrollo `'cpu-scheduler'` → `'../src/index.ts'`, habilitando la integración de React e inyectando de forma global el archivo de tokens CSS del núcleo para que afecte a todas las demos y componentes embebidos.

```js
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url)); 
export default defineConfig({
  integrations: [
    react(),
    starlight({
      title: 'CPU Scheduler Simulator',
      // Inyección obligatoria de tokens globales para evitar colisiones en las guías
      customCss: [
        '../src/react/style/tokens.css', 
      ],
      sidebar: [
        {
          label: 'Guías',
          items: [
            { label: 'Integración del componente', link: '/guide/01-integracion-del-componente' },
            { label: 'Configuración y escenarios', link: '/guide/02-configuracion-y-escenarios' },
            { label: 'Crear nuevo algoritmo',      link: '/guide/03-crear-nuevo-algoritmo' },
          ],
        },
        {
          label: 'No expropiativos',
          items: [
            { label: 'FCFS',           link: '/cpu-scheduler/non-preemptive/fcfs' },
            { label: 'SJF',            link: '/cpu-scheduler/non-preemptive/sjf' },
            { label: 'LJF',            link: '/cpu-scheduler/non-preemptive/ljf' },
            { label: 'Prioridad (NP)', link: '/cpu-scheduler/non-preemptive/prio-n' },
          ],
        },
        {
          label: 'Expropiativos',
          items: [
            { label: 'Round Robin',         link: '/cpu-scheduler/preemptive/round-robin' },
            { label: 'SRTF',               link: '/cpu-scheduler/preemptive/srtf' },
            { label: 'Prioridad (P)',       link: '/cpu-scheduler/preemptive/prio-p' },
            { label: 'Round Robin Virtual', link: '/cpu-scheduler/preemptive/virtual-round-robin' },
            { label: 'MLFQ',               link: '/cpu-scheduler/preemptive/mlfq' },
          ],
        },
      ],
    }),
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


**Restricciones de Implementación:**

* Crear las páginas vacías en formato Markdown/MDX correspondientes a los 9 algoritmos según las rutas especificadas en el `sidebar`.

* Asegurar la existencia del archivo de tokens base en src/react/style/tokens.css declarando al menos las propiedades básicas y la paleta de procesos del plan (`--scheduler-process-0` hasta el `9`) en el bloque `:root`.

* Limpieza de CSS: Se prohíbe el uso de `@import './tokens.css'` dentro de los archivos `*.module.css` individuales de los componentes React; estos dependerán exclusivamente de la inyección global configurada en Astro.

**Verificación:** `docs:dev` levanta el entorno sin errores, `docs:build` compila el estático correctamente y el alias de TypeScript/Astro resuelve los componentes del core sin dependencias rotas.


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
}
// io_exit es DERIVADO. v2 tiene un único dispositivo; no hay campo `device`.

interface DeviceState {
  readonly serving: string | null;     // pid en servicio
  readonly remaining: number;          // ticks restantes del servicio
  readonly queue: readonly string[];   // cola FCFS de pids esperando
}
```

**Verificación:** compila; `DeviceState.queue` es `readonly string[]`.

### T-04 · `ReadyProcess`, `PreemptionTrigger`, `SchedulerEvent` e `IAlgorithm` (`algorithm.ts`)

```ts
interface ReadyProcess {
  readonly id: string;
  readonly arrival_time: number;
  readonly burst_time: number;
  readonly remaining: number;
  readonly priority?: number;
}
// NO lleva `io`: el algoritmo decide CPU, no E/S.

// Disparadores declarativos: cada algoritmo declara cuándo el motor reevalúa/expropia.
type PreemptionTrigger =
  | 'on-tick' | 'on-arrival' | 'on-io-return'
  | 'on-quantum' | 'on-boost';

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
  readonly triggers: ReadonlySet<PreemptionTrigger>;
  readonly requires: { priority?: boolean; quantum?: boolean; io?: boolean; levels?: boolean };
  select(ready: readonly ReadyProcess[]): ReadyProcess;
  quantumFor?(p: ReadyProcess): number | null;
  onEvent?(e: SchedulerEvent): string | null;
}
// `levels: true` (solo MLFQ) → la UI usa quanta por nivel (2 campos) en lugar de un único quantum.
```

> **Nota (migración completada, ADR 28-06-2026):** el antiguo enum `preemptionMode` se sustituyó por `triggers` (conjunto declarativo de disparadores). El motor reacciona a los disparadores con una rutina genérica; añadir un algoritmo con una mezcla nueva no exige tocarlo. Detalle en `TECHNICAL.md § Disparadores` y los ADR de `DECISIONS.md`.

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

**Verificación:** `typecheck` confirma que `History` es indexable con `noUncheckedIndexedAccess` (devuelve `HistoryEvent | undefined`).

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
}

// Persistido aparte en sessionStorage (solo la última rama)
interface WhatIfBranch {
  readonly fromTick: number;
  readonly state: SchedulerState;
}
```

**Verificación:** `typecheck`.

---

## Fase 2 — Registry (`src/core/registry.ts`)

### T-08 · Registro y búsqueda

`type AlgorithmFactory = (params?: AlgorithmParams) => IAlgorithm`

`register(factory: AlgorithmFactory): void` — llama a `factory()` una vez para obtener el nombre y almacena la fábrica.
`get(name: string, params?: AlgorithmParams): IAlgorithm` — llama a la fábrica con los params y devuelve una instancia **nueva** en cada llamada.

Error descriptivo si el nombre no existe, listando los disponibles; si el registro está vacío muestra `"(ninguno)"`.

**Motivación del patrón fábrica:** los algoritmos con estado interno (VRR, MLFQ) no pueden reutilizarse entre llamadas a `run()` — cada simulación debe recibir una instancia limpia y construida con los params correctos (ej. `quantum`). Los algoritmos sin estado (FCFS, SRTF…) no se ven afectados.

**Registro en `src/index.ts`:**
```ts
register(() => new FCFS());
register((params) => new VirtualRoundRobin(
  typeof params?.quantum === 'number' ? params.quantum : 1,
));
// etc.
```

**Llamada en `simulate.ts`:**
```ts
const algo = get(config.algorithm, { quantum: config.quantum, boostInterval: config.boostInterval });
```

**Cierra:** `§ Registro de algoritmos` — `tests/core/registry.test.ts`

---

## Fase 3 — Motor (`src/core/simulate.ts` + `engine/` + `derive/`) y subsistema de E/S

> **NOTA (refactor post-fase, ADR 28-06-2026):** el motor se modularizó. `simulate.ts` quedó como **fachada pública** (`run`/`runFrom` + reexport de derivaciones); el bucle por ticks vive en `engine/loop.ts` (función `executeSimulationLoop`), la validación en `engine/validate.ts` y las derivaciones puras en `derive/intervals.ts` y `derive/metrics.ts`. Las rutas de abajo describen el estado original de la fase; sustitúyelas mentalmente por esa estructura.

> **RESTRICCIONES ARQUITECTÓNICAS CRÍTICAS PARA EL AGENTE:**
> 1. PROHIBIDO duplicar el bucle principal de simulación. `run` y `runFrom` DEBEN ser simples "wrappers" que preparen el estado inicial y llamen a una única función central (`executeSimulationLoop` en `engine/loop.ts`).
> 2. PROHIBIDO implementar lógica de dispositivos dentro del motor. Toda la mecánica de E/S DEBE aislarse en `io-subsystem.ts`.
> 3. PROHIBIDO mutar la lista `ready` original al evaluar expropiaciones.
> 4. PROHIBIDO usar `Math.random` o `Date.now`.

### T-09 · Bucle tick a tick y CPU inactiva

Crear la función central `executeSimulationLoop(initialState, config, processes)` (tras el refactor, en `engine/loop.ts`) que contenga el `while` principal. Implementar `run(processes, config)` para que genere un estado inicial vacío (tick 0) y llame a esta función. Detectar CPU inactiva y escribir un `HistoryEvent` por tick.

**Cierra:** `§ CPU inactiva` — `tests/core/simulate.test.ts`

### T-10 · Desempate global

Inmediatamente antes de invocar `algorithm.select()`, el motor DEBE construir la lista `ReadyProcess[]` ordenando los candidatos mediante comparación natural: `(a, b) => a.arrival_time - b.arrival_time || naturalCompare(a.id, b.id)`. El algoritmo recibe esta lista ya ordenada.

**Cierra:** `§ Determinismo sin E/S` — `tests/core/simulate.test.ts`

### T-11 · Modo `'none'` (no expropiativo)

Implementar la evaluación de selección. Si `triggers` está vacío (no expropiativo), el motor solo llama a `select()` si la CPU está inactiva (`onCPU === null`).

**Cierra:** `§ Simular — FCFS` — `tests/core/simulate.test.ts`

### T-12 · Modo `'on-better'` (expropiativo por mejor proceso)

Si el modo es `'on-better'`, el motor llama a `select()` en cada tick. Para no romper el estado, el motor DEBE añadir temporalmente el proceso `onCPU` a la lista de candidatos, llamar a `select()`, y si el resultado es distinto al proceso actual, emitir el evento `preempted` y hacer el cambio.

**Cierra:** `§ Simular — SRTF` — `tests/core/simulate.test.ts`

### T-13 · Modo `'on-quantum'` (Round Robin)

Implementar el límite de tiempo. Leer de `algorithm.quantumFor(p)` (si existe) o de `config.quantum`. Expropiar estrictamente cuando el contador llega a 0, emitiendo el evento `quantum-expiry` con la propiedad `ranFor`.

**Cierra:** `§ Simular — Round Robin` — `tests/core/simulate.test.ts`

### T-14 · Subsistema de E/S (`io-subsystem.ts`)

Crear la clase o módulo independiente `IOSubsystem`. Debe gestionar su propio estado interno (`devices`, `queues`, `serving`). Debe exponer métodos puros como `tick()`, `admitProcess(pid, io_time, device)`, `getCompletedThisTick()`.

```ts
// src/core/io-subsystem.ts
import type { DeviceState } from './types/io.ts';

export class IOSubsystem {
  private serving: string | null = null;
  private remaining: number = 0;
  private queue: string[] = []; // Array de PIDs

  contructor() {}
  /**
   * Recibe una petición de E/S.
   * Si el dispositivo está libre, entra a servicio. Si no, va a la cola FCFS.
   */
  public requestIO(pid: string, ioTime: number): void {
    // TODO: Implementar lógica de inserción
  }

  /**
   * Avanza la mecánica del dispositivo en 1 tick.
   * @returns El ID del proceso que acaba de terminar su E/S, o null.
   */
  public tick(): string | null {
    // TODO: Implementar decremento de `remaining`.
    // Si llega a 0, liberar el dispositivo, admitir a la cabeza de la queue y devolver el PID completado.
  }

  /**
   * Devuelve una instantánea inmutable del estado del dispositivo para el SchedulerState o HistoryEvent.
   */
  public getState(): DeviceState {
    return {
      serving: this.serving,
      remaining: this.remaining,
      queue: [...this.queue]
    };
  }
}
```

**Cierra:** `§ Contención del dispositivo de E/S` — `tests/core/io-subsystem.test.ts`

### T-15 · Integrar E/S en el motor

Dentro del `while` de simulación, si `requires.io` es true, conectar `IOSubsystem`. El flujo del tick DEBE seguir estrictamente este orden:
1. Consumo de CPU y E/S (decrementar contadores).
2. Fin de tramo CPU. Se debe comprobar el estado del proceso actual (`onCPU`):
   - Si ha llegado a su `io_entry`: Emitir el evento `io-start`, enviar el proceso al `IOSubsystem` y **obligatoriamente liberar la CPU** (`currentState.onCPU = null`) en este mismo tick para permitir el cambio de contexto.
   - Si ha agotado su ráfaga por completo: Emitir `completed` y liberar la CPU (`currentState.onCPU = null`).
3. Fin de servicio E/S: Interrogar al subsistema qué procesos han terminado (esto disparará `io-return` en el paso 5).
4. Ensamblado de Narrativa: Gestionar los mensajes del algoritmo. Al registrar HistoryEvent, si el tick actual tiene un mensaje de entrada (dispatch) y el tick anterior tiene un mensaje de salida (salida de CPU), concatenarlos usando la plantilla: "{salida}. A continuación, {entrada}".
5. Inserciones en ready (estrictamente en este orden, ordenados por ID dentro de cada grupo): Retornos de E/S (`io-return`) → Llegadas (`arrival`) → Reencolado por quantum (`quantum-expiry`).
6. Decisión de reparto (Llamar a `select()` según los `triggers` del algoritmo).
7. Volcar historial: Interrogar al `IOSubsystem` para rellenar `inIO` y `waitingIO`.

**Cierra:** `§ Orden intra-tick y empate ráfaga/quantum` — `tests/core/simulate.test.ts`

### T-16 · Modo `'io-return'`

Si `triggers` incluye `'on-io-return'`, el motor forzará una llamada a `select()` en el instante exacto en que haya retornos de E/S (paso 3 del intra-tick), permitiendo al algoritmo expropiar la CPU.

**Cierra:** `Determinismo con E/S (VRR)` (desempate) — `tests/core/simulate.test.ts`

### T-17 · Modo `'on-quantum-and-better'`


Implementar la lógica híbrida. Controlar el quantum (como T-13) y la llegada a nivel superior (como T-12). Añadir comprobación modular: si `tick % boostInterval === 0`, emitir evento `priority-boost` y forzar una reevaluación de `select()`.

**Cierra:** `§ Determinismo con niveles (MLFQ)` — `tests/core/simulate.test.ts`

### T-18 · Mensajes ricos
Implementar la captura de fragmentos descriptivos.

1. onEvent debe retornar `{ text: string } | null` (o el string plano para compatibilidad).

2. Si el retorno es `{ text: string }`, el motor lo pre-procesa concatenando el pid del evento (ej: `"P1 {text}"`).

3. El motor almacena el fragmento en un buffer temporal (`ls.tickMessage`).

4. Si en el tick siguiente hay un nuevo fragmento, el motor ejecuta la lógica de concatenación definida en T-15.

5. Si `onEvent` devuelve null, usar los mensajes genéricos predeterminados.

**Cierra:** `§ Mensajes ricos — HistoryEvent.message` — `tests/core/simulate.test.ts`

### T-19 · Derivación de `intervals` y `metrics` (funciones puras)


Implementar `deriveIntervals(history)` y `deriveMetrics(history, processes)` fuera del bucle principal (tras el refactor, en `derive/intervals.ts` y `derive/metrics.ts`; `simulate.ts` las reexporta). Calcular `waiting = turnaround - CPU_total - bloqueado_total`. Para algoritmos clásicos, `bloqueado_total` será siempre 0.

**Cierra:** `§ Historial y métricas` (todos los criterios) — `tests/core/simulate.test.ts`

### T-20 · Coherencia del `history`

Asegurar que la lista `completed` crece monotónicamente y que el último tick del historial refleja una simulación terminada o CPU inactiva correcta.

**Cierra:** `§ Coherencia de métricas y estado` — `tests/core/simulate.test.ts`

### T-21 · `runFrom(state)` para what-if

Implementar `runFrom(state, config, allProcesses)`. DEBE instanciar un estado derivado del `state` proporcionado y llamar internamente a `_executeSimulationLoop()`. Prohibido copiar la lógica del bucle.

**Cierra:** `§ Rederivación — what-if e inyección en vivo` (criterios 1–3) — `tests/core/simulate.test.ts`

### T-22 · Inyección en vivo

Validar `arrival_time`. Si un proceso de `allProcesses` no completado tiene `arrival_time < state.tick`, lanzar Error. Si es válido, se procesará de forma natural en `_executeSimulationLoop`.

**Cierra:** `§ Rederivación — what-if e inyección en vivo` (criterios 4–5) — `tests/core/simulate.test.ts`

### T-23 · Casos límite y validación


En `validateProcesses()`, asegurar que se lanzan Errores si no se cumple lo siguiente: `burst_time > 0`, `arrival_time >= 0`. Para la lista de E/S: `io_entry` debe ser estrictamente creciente, `io_entry > 0`, `io_entry < burst_time`, e `io_time > 0`. Implementar protección anti-bucle (`tick > 100_000` lanza Error).

**Cierra:** `§ Conjunto vacío`, `§ Validación de configuración`, `§ Seguridad y tolerancia a fallos` — `tests/core/simulate.test.ts`

### T-24 · Aislamiento de dependencias (Node)

Escribir un test en `tests/core/simulate.test.ts` que importe `run()` garantizando su ejecución en entorno Node, sin dependencias de React, DOM ni `sessionStorage`.

**Cierra:** `§ Simulador independiente de la vista`, `§ Estructura del resultado de simulación` — `tests/core/simulate.test.ts`

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

**Cierra:** `§ Utilidad FifoQueue` — `tests/core/algorithms/shared/fifo-queue.test.ts`

### T-27–T-33 · Algoritmos clásicos (7)

| ID | Archivo | `triggers` | `require` | `select` | Cierra | Test |
|----|---------|------------|:---:|----------|--------|------|
| T-27 | `non-preemptive/fcfs.ts` | `{}` |  {} | FIFO | `§ Simular — FCFS` | `fcfs.test.ts` |
| T-28 | `non-preemptive/sjf.ts` | `{}` | {} | menor `remaining` | `§ Simular — SJF (no expropiativo)` | `sjf.test.ts` |
| T-29 | `non-preemptive/ljf.ts` | `{}` | {} | mayor `burst_time` | `§ Simular — LJF (no expropiativo)` | `ljf.test.ts` |
| T-30 | `non-preemptive/priority-np.ts` | `{}` | {priority : true} | menor `priority` | `§ Simular — Prioridad (no expropiativa)` | `priority-np.test.ts` |
| T-31 | `preemptive/srtf.ts` | `{ on-tick }` | {} | menor `remaining` | `§ Simular — SRTF` | `srtf.test.ts` |
| T-32 | `preemptive/priority-p.ts` | `{ on-tick }` | {priority : true} | menor `priority` | `§ Simular — Prioridad (expropiativa)` | `priority-p.test.ts` |
| T-33 | `preemptive/round-robin.ts` | `{ on-quantum }` | {} | FIFO | `§ Simular — Round Robin` | `round-robin.test.ts` |

**Cierra también:** `§ Algoritmos clásicos — solo CPU` (ignoran `io` en procesos)

### T-34 · Round Robin Virtual (`preemptive/virtual-round-robin.ts`)

`triggers: { on-quantum, on-io-return }`, `requires: { io: true, quantum: true }`.
Estado interno: `mainQueue: FifoQueue<string>`, `auxQueue: FifoQueue<string>`, `remainingSlice: Map<string, number>`, `lastDispatchedFromAux: boolean` (para rastreo de mensajes).

Implementa `select` (auxQueue → mainQueue), `quantumFor` (sobrante desde auxQueue, quantum completo desde mainQueue), y validación de `paramSchema` (`quantum` integer min 1).

**Reglas de Planificación:**
1. Llegada nueva → `mainQueue` (Prioridad 1).
2. Agota quantum → `mainQueue`.
3. Se bloquea por E/S antes de agotar quantum → al volver, `auxQueue` (Prioridad 0) con sobrante. Si sobrante = 0 → `mainQueue`.
4. `select`: cabeza de `auxQueue` si no vacía; si no, cabeza de `mainQueue`.
5. `quantumFor`: sobrante desde `auxQueue`, quantum completo desde `mainQueue`.
6. **Expropiación en io-return:** si CPU ejecuta desde `mainQueue` y llega proceso a `auxQueue`, expropia inmediatamente (`preempted`).

**Reglas de Mensajes Ricos (Narrativa Compuesta):**
`onEvent` debe retornar fragmentos encadenables `{ text: string } | null` pensados para que el motor los concatene (Ej: Salida + Entrada).
- `dispatch`: "toma la CPU desde la cola [auxiliar/principal]...".
- `quantum-expiry` / `preempted` / `io-start`: "agotó su quantum..." / "fue expropiado..." / "se bloquea por E/S...".
- `io-return`: "se inserta en la cola auxiliar con sobrante de X" o "se reencola en la cola principal".

**Cierra:** `§ Simular — Round Robin Virtual (expropiativa)`, `§ Determinismo con E/S (VRR)` — `tests/core/algorithms/preemptive/virtual-round-robin.test.ts`


### T-35 · MLFQ (`preemptive/multilevel-feedback.ts`)

`triggers: { on-quantum, on-arrival, on-io-return, on-boost }`, `requires: { quantum: true, levels: true }`.
El flag `levels: true` indica a `AlgorithmParamsForm` que renderice un quantum **por nivel** (2 campos) más `boostInterval`, en vez de un único `quantum`.
Constructor `new MLFQ(quanta: [number, number])`; la fábrica registrada en `src/index.ts` lee `params.quanta` (que llega desde la demo vía `RunConfig.quanta`) y construye la instancia con esos dos quanta.
Estado interno: `levels: [FifoQueue<string>, FifoQueue<string>, FifoQueue<string>]` (siempre 3), `processLevel: Map<string, number>`.

**3 niveles fijos:** nivel 0 (RR, `quanta[0]`), nivel 1 (RR, `quanta[1]`), nivel 2 (FCFS **run-to-completion**). `quanta` es siempre un array de exactamente 2 enteros `> 0`. El número de niveles NO es configurable.

Implementa `select` (nivel no vacío de menor índice, **protegiendo al proceso en CPU para que ninguna llegada lo expropie**), `quantumFor` (`quanta[processLevel.get(pid)]` para niveles 0 y 1; `0` para nivel 2 → el motor no expira por la guarda `currentSlice > 0`), `onEvent` (mantiene niveles + devuelve motivo rico).

Reglas:
1. Llegada nueva → `levels[0]`.
2. `select`: cabeza de `levels[i]` para menor `i` no vacío. **Excepción (no expropiación por llegada):** si hay un proceso en CPU (`currentCpuPid`) y sigue listo, `select` lo devuelve siempre. Una llegada nunca expropia.
3. `quantumFor`: `quanta[nivel]` para nivel 0 y 1; `0` para nivel 2 (sin expiración de quantum).
4. Agota quantum → degrada: nivel 0 → 1, nivel 1 → 2. En nivel 2 no degrada más.
5. **Expropiación SOLO por quantum:** mientras un proceso ejecuta (niveles 0/1), las llegadas se encolan en `levels[0]` y esperan; el proceso conserva la CPU hasta agotar su quantum. Al agotarlo se degrada y, con la CPU libre, `select` elige el `levels[i]` no vacío de menor índice (típicamente un proceso del nivel 0 que estaba esperando).
6. Nivel 2 (FCFS): **run-to-completion**. Una vez toma la CPU corre hasta completar; no se expropia ni por llegada ni por boost (`quantumFor = 0`).
7. Priority boost: cada `boostInterval` ticks, todos a `levels[0]` (el proceso en CPU de nivel 0/1 también; se reevalúa `select`). Empate: menor `id`. **El proceso del nivel 2 en CPU es la excepción: el boost no lo afecta.** Sin `boostInterval` → sin boost.

**Cierra:** `§ Simular — MLFQ (expropiativa)`— `tests/core/algorithms/preemptive/multilevel-feedback.test.ts`

### T-36 · Contrato de extensibilidad

Algoritmo de prueba con `onEvent` + `quantumFor` registrado y simulado sin tocar el motor.

**Cierra:** `§ Contrato de algoritmo (extensibilidad)`, `§ Verificación de contrato de algoritmo (Extensibilidad)` — `tests/core/algorithms/contracts.test.ts`

---

## Fase 6 — Componente React (`src/react/`)

> Arquitectura Desacoplada: Los componentes se conectan mediante React Context (uno por simulación).
> **Separación estricta:** `SimulationProvider` orquesta el estado y llama al core; `SimulationApp` orquesta la UI. 
> Los visuales solo leen del contexto. Cada componente visual crea su `.module.css` en `src/react/style/`.

### T-37 Tokens visuales base

Archivo: `src/react/style/tokens.css` (Debe ser un archivo CSS global, PROHIBIDO usar extensión `.module.css` para este archivo).
con las variables visuales compartidas del simulador.

**Estructura del archivo y soporte de temas:**
El archivo debe definir el diseño adaptativo utilizando bloques :root y selectores de tema compatibles con Starlight ([data-theme="light"] y [data-theme="dark"], junto con el fallback de prefers-color-scheme).

```css
/* Valores estructurales independientes del tema */
:root {
  --scheduler-space-xs: 4px;
  --scheduler-space-sm: 8px;
  --scheduler-space-md: 16px;
  --scheduler-space-lg: 24px;
  
  --scheduler-radius-sm: 4px;
  --scheduler-radius-md: 8px;
  
  --scheduler-btn-height-sm: 32px;
  --scheduler-btn-height-md: 40px;
  
  --scheduler-gantt-cell-width: 24px;
  --scheduler-gantt-cell-height: 24px;
  --scheduler-gantt-cell-gap: 2px;
}

/* Paleta semántica por defecto (Tema Claro) */
:root, [data-theme="light"] {
  --scheduler-bg: #ffffff;
  --scheduler-surface: #f8fafc;
  --scheduler-surface-elevated: #f1f5f9;
  --scheduler-text-primary: #0f172a;
  --scheduler-text-secondary: #475569;
  --scheduler-border: #cbd5e1;
  --scheduler-accent: #2563eb;
  --scheduler-focus: #3b82f6;
  --scheduler-danger: #dc2626;
  --scheduler-warning: #d97706;
  --scheduler-success: #16a34a;

  /* Colores de procesos de alto contraste (Claro) */
  --scheduler-process-0: #3b82f6;
  --scheduler-process-1: #ef4444;
  --scheduler-process-2: #10b981;
  --scheduler-process-3: #f59e0b;
  --scheduler-process-4: #8b5cf6;
  --scheduler-process-5: #ec4899;
  --scheduler-process-6: #14b8a6;
  --scheduler-process-7: #f97316;
  --scheduler-process-8: #6b7280;
  --scheduler-process-9: #06b6d4;
}

/* Paleta semántica (Tema Oscuro) */
@media (prefers-color-scheme: dark) {
  :root {
    /* Sobreescribir variables semánticas para modo oscuro automático */
  }
}
[data-theme="dark"] {
  --scheduler-bg: #0f172a;
  --scheduler-surface: #1e293b;
  --scheduler-surface-elevated: #334155;
  --scheduler-text-primary: #f8fafc;
  --scheduler-text-secondary: #94a3b8;
  --scheduler-border: #475569;
  --scheduler-accent: #3b82f6;
  --scheduler-focus: #60a5fa;
  --scheduler-danger: #ef4444;
  --scheduler-warning: #f59e0b;
  --scheduler-success: #10b981;

  /* Ajustar opacidades o tonos de los 10 procesos para modo oscuro si es necesario */
}
```

**Restricciones de diseño:**

* Consumo en Componentes: Los archivos de estilos locales de los componentes (*.module.css) consumirán estas variables directamente utilizando var(--scheduler-...). Queda terminantemente prohibido importar tokens.css dentro de un CSS Module.

* No se permite el uso de literales de color (`#ffffff, rgba(...)`) en los componentes si existe una abstracción semántica en los tokens.

* **Iconografía**: No se permite la instalación de librerías de iconos de terceros (como lucide-react o font-awesome). Los iconos requeridos deben ser implementados como componentes React puros que retornen elementos `<svg>` nativos configurados con `fill="currentColor"` o `stroke="currentColor"` para que hereden los tokens de texto.

**Verificación**:
- **Test de Componente (Vitest + React Testing Library):** Crear `tests/react/GanttChartTokens.test.tsx` para verificar la correcta asignación de clases y variables personalizadas:
  1. Comprobar que el contenedor de la fila recibe la variable CSS local mediante el atributo style (ej. `expect(row).toHaveStyle('--process-color: ...')`).
  2. Comprobar que las celdas de la grilla reciben las clases de estado correctas (`.cpu`, `.waiting`, `.idle`) según el tick de la simulación.
- **Verificación Estática:** Comprobar que `src/react/style/tokens.css` existe y que ninguna clase en los archivos `*.module.css` introduce harcodeos de colores (valores hexadecimales o rgb directos).
- **Verificación de Integración:** El comando `npm run docs:build` compila el subproyecto Astro sin lanzar errores de importación o estilos ausentes.


### T-38 · `SimulationContext` + `<SimulationProvider>` (Gestor de Estado Puro)

`SimulationContext.ts`: contexto y hook `useSimulation()` (error si se usa fuera del Provider).

`SimulationProvider.tsx`: recibe `{ algorithm, processes, params?, children }`. Al montar: llama a `run()`, instancia un `Player`, expone por contexto `SimulationResult`, `HistoryEvent` actual, `Player`, error, y **API de rama what-if** (`createWhatIf`, `discardWhatIf`, `whatIfBranch`). 

Soporta `runFrom()` para what-if/inyección. Mantiene el estado estrictamente en memoria durante esta fase.

**Restricción crítica:** No renderiza **ningún elemento visual de UI** (tablas, gráficos, etc.). Su único retorno renderizado debe ser `<SimulationCtx.Provider>{children}</SimulationCtx.Provider>`.

**Cierra:** `§ Conjunto vacío`, `§ Render — SimulationProvider y Gestión de Estado` — `tests/react/SimulationProvider.test.tsx`

### T-39 · `<SimulationApp>` (Contenedor Visual Principal)

Archivos: `SimulationApp.tsx`, `style/SimulationApp.module.css`.

Es el orquestador visual. Recibe la misma configuración inicial (`algorithm`, `processes`, `params`) y envuelve toda la estructura dentro del `<SimulationProvider>`. 
Debe implementar el layout de la interfaz organizando la cuadrícula de los subcomponentes (`AlgorithmParamsForm`, `ProcessTable`, `GanttChart`, `PlaybackControls`, `MetricsTable` y `ProcessForm`). 
Soporta inyección directa de clases CSS o directivas de layout para adaptarse a los dos modos requeridos (Panel Unificado o Componentes Intercalados).

**Cierra:** `§ Render — SimulationApp (Orquestador Visual)` y colabora en `§ Escenario de ejemplo por defecto` — `tests/react/SimulationApp.test.tsx`

### T-40 · `<ProcessTable>`

Archivos: `ProcessTable.tsx`, `style/ProcessTable.module.css`.

Lee procesos y descriptor del algoritmo (`requires`) del contexto. Columnas base: `id`,
`arrival_time`, `burst_time`. Columna `priority` solo si `requires.priority`. Columnas
`io_entry`, `io_time`, `io_exit` (derivado) solo si `requires.io`. Filas alternadas.

Reglas visuales para tablas:

- Cabeceras con fondo diferenciado.
- Filas alternadas mediante token.
- Texto numérico alineado de forma consistente.
- Bordes suaves usando token de borde.
- Altura mínima de fila definida por token.
- El modo oscuro debe mantener contraste entre filas alternadas.

**Cierra:** `§ Página de algoritmo y campos declarados`, `§ Render — ProcessTable` — `tests/react/ProcessTable.test.tsx`

### T-41 · `<GanttChart>` (tamaño fijo, estados de E/S y cabecera de ticks)

Archivos: `GanttChart.tsx`, `style/GanttChart.module.css`.

Layout de arriba abajo:
1. **Mensaje** — `HistoryEvent.message` del tick actual (mensaje rico).
2. **Matriz (Cabecera + Grilla)** — Tamaño **fijo desde el inicio**: todas las columnas renderizadas, navegar solo cambia el color. La matriz tiene borde redondeado, fondo de superficie y **scroll horizontal** (las filas enteras se desplazan juntas, sin scroll vertical) sin superar el ancho del simulador. La celda en CPU muestra la etiqueta «CPU» (texto blanco, animación de pulso) y la celda en servicio de E/S muestra «E/S»; el resto de celdas solo color. La **primera fila** (cabecera de ticks) y la **primera columna** (nombres de proceso) van con color de superficie elevada, distinto al cuerpo. Tipografía monoespaciada.
3. **Leyenda** — Recuadro con borde y swatches de color. Entradas: «Ejecución (CPU)», «En Espera (Listo)», «Inactivo (Vacío)»; si `requires.io`, además «Bloqueado (E/S)» y «Cola de E/S».


### Estructura de la matriz y Renderizado (React):
- **Fila 0 (Cabecera Superior):** La primera fila de la matriz DEBE ser una fila de cabecera (`.rowHeader`) que contenga los números de tick (`0`, `1`, `2`, ..., `último tick`). Debe incluir un elemento espaciador inicial invisible/vacío para empujar los números de tick y alinearlos exactamente sobre sus respectivas columnas de celdas inferiores, saltándose el hueco de la cabecera lateral.
- **Filas de Procesos:** Únicamente se renderiza una fila por cada proceso real (`P1`, `P2`, etc.). **QUEDAN PROHIBIDAS** las filas artificiales para estados intermedios como "Idle" o "Inactivo". El estado de CPU Inactiva se representará pintando con la clase `.idle` (fondo de superficie elevada) las celdas de la columna correspondiente donde ningún proceso esté en CPU.
- **Estructura de Fila Uniforme:** Cada fila (incluida la cabecera) debe usar exactamente la misma estructura de contenedores y alineación vertical centralizada para evitar desalineaciones (*offsets*) entre la etiqueta de texto y las celdas de color.
- **Sin estilos en línea destructivos:** Las celdas NO deben recibir estilos en línea (`style={...}`) que sobreescriban el color de fondo directamente si eso destruye los estados CSS de opacidad o tramas. Los colores de los procesos se inyectarán como una variable CSS local al contenedor de la fila (ej. `style={{ '--process-color': color } as React.CSSProperties}`) para que las clases de estado puedan usar ese color base.

---

### 🛠️ Especificación de Estilos y Maquetación (GanttChart.module.css)

El archivo CSS DEBE implementar la siguiente estructura y utilizar obligatoriamente los tokens globales del sistema:

```css
.row, .rowHeader {
  display: flex;
  align-items: center; /* Evita que el texto de las etiquetas desalinee los cubos verticalmente */
  gap: var(--scheduler-gantt-cell-gap);
  height: var(--scheduler-gantt-cell-height);
}

.cell, .tickNumber {
  width: var(--scheduler-gantt-cell-width);
  height: var(--scheduler-gantt-cell-height);
  box-sizing: border-box;
}

.tickNumber {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* El estado usa la variable `--process-color` inyectada por el componente */
.cpu {
  background-color: var(--process-color);
}

.waiting {
  background-color: var(--process-color);
  opacity: 0.4; /* Aplica reducción de opacidad limpia sobre el color base */
}

.idle {
  background-color: var(--gray-distinguishable, #4a4a4a);
}

/* Fallbacks visuales para accesibilidad y tramas de E/S */
.io-serving {
  background-color: var(--process-color);
  /* Trama diagonal (rayado) combinada con el color base sin depender solo de él */
  background-image: repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 8px);
}

.io-waiting {
  background-color: var(--process-color);
  /* Trama distinta (punteado) para ver contención */
  background-image: radial-gradient(rgba(255,255,255,0.3) 15%, transparent 16%);
  background-size: 4px 4px;
}
```

### Detalles técnicos obligatorios complementarios:
* Paleta automática de procesos de al menos 10 colores diferenciados (vía tokens predefinidos del tema).
* En modo oscuro, los colores deben mantener diferenciación y contraste suficiente.
* Las celdas de los ticks posteriores al actual quedan en estado vacío (`.empty`), sin revelar color.

#### Actualización estética (rediseño aplicado)

El bloque CSS anterior es la base; el rediseño final (ver ADR en `DECISIONS.md`) lo refina:
* **Etiquetas dentro de la celda:** la celda en CPU muestra «CPU» y la de E/S en servicio «E/S» (`.cpuText`, texto blanco con `@keyframes` de pulso); el nivel MLFQ se muestra como `L{n}` en un badge (`.levelBadge`).
* **Estados de E/S** usan **color de aviso** (`--scheduler-danger`, rojo) en lugar del color del proceso: `.ioServing` con rayado diagonal, `.ioWaiting` con punteado y opacidad.
* **CPU inactiva** (`.idle`) usa `--scheduler-surface-elevated`.
* **Tabla:** `.matrix` con borde, `border-radius`, fondo de superficie y `overflow-x: auto` (scroll horizontal, `overflow-y: hidden`). `.rowHeader` y `.label` con `--scheduler-surface-elevated`. Bordes de rejilla entre filas/columnas con `--scheduler-border`.
* **Tipografía** monoespaciada en mensaje, números de tick, etiquetas y leyenda; efecto `hover` (brillo) en las celdas.
* Iconos SVG nativos (`PlusIcon`, `TrashIcon`) en los controles del `ProcessForm`.

**Cierra**: `§ Render — GanttChart` (todos los criterios v02) — `tests/react/GanttChart.test.tsx`
### T-42 · `<PlaybackControls>`


Archivos:
- PlaybackControls.tsx
- style/PlaybackControls.module.css
- icons/FirstIcon.tsx
- icons/PreviousIcon.tsx
- icons/PlayIcon.tsx
- icons/PauseIcon.tsx
- icons/NextIcon.tsx
- icons/LastIcon.tsx

#### 1. Componentes de Iconos (Crear exactamente con este código)


- **`src/react/icons/FirstIcon.tsx`**
```tsx
export const FirstIcon = () => (
  <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="19 20 9 12 19 4 19 20" fill="currentColor"></polygon>
    <line x1="5" y1="19" x2="5" y2="5"></line>
  </svg>
);
``` 
- **`src/react/icons/PreviousIcon.tsx`**
```tsx
export const PreviousIcon = () => (
  <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="15 18 9 12 15 6 15 18" fill="currentColor"></polygon>
  </svg>
);
``` 
- **`src/react/icons/PlayIcon.tsx`**
```tsx
export const PlayIcon = () => (
  <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"></polygon>
  </svg>
);
``` 
- **`src/react/icons/PauseIcon.tsx`**
```tsx
export const PauseIcon = () => (
  <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="6" y="4" width="4" height="16" fill="currentColor"></rect>
    <rect x="14" y="4" width="4" height="16" fill="currentColor"></rect>
  </svg>
);
``` 
- **`src/react/icons/NextIcon.tsx`**
```tsx
export const NextIcon = () => (
  <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="9 18 15 12 9 6 9 18" fill="currentColor"></polygon>
  </svg>
);
``` 
- **`src/react/icons/LastIcon.tsx`**
```tsx
export const LastIcon = () => (
  <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="5 4 15 12 5 20 5 4" fill="currentColor"></polygon>
    <line x1="19" y1="5" x2="19" y2="19"></line>
  </svg>
);
``` 

2. Requisitos de Implementación para <PlaybackControls>
Importar los 6 componentes de iconos anteriores desde `./icons/` .

* Implementar los botones en el orden estricto: Ir al inicio, Paso atrás, Reproducir/Pausar, Paso adelante, Ir al final.
* Colocar los iconos directamente dentro de las etiquetas <button>. Queda estrictamente prohibido usar caracteres Unicode o emojis.
* Cada botón debe incluir un atributo aria-label descriptivo para accesibilidad.
* El tamaño visual de los iconos debe controlarse mediante la propiedad font-size mapeada al token `--scheduler-icon-size-md` definido en T-37.
* Incluir la barra de desplazamiento (<input type="range">) que abarque todo el ancho, vinculada al estado del tick actual (de 0 al último tick del historial).
* Incluir un indicador de texto con el formato estricto: Tick: N / Total.
* Controlar los estados deshabilitados (disabled con opacidad reducida) cuando el recorrido llegue a los límites (0 o el tick final).
* Centralizar la lógica de requestAnimationFrame y deltaTime exclusivamente en este componente para la reproducción automática.
* **Reutilizable con varias líneas de tiempo:** acepta una prop opcional `controller` (`{ currentTick, lastTick, hasHistory, stepForward, stepBackward, seekTo }`) y un prefijo `testId` (raíz, `-range`, `-tick`). Sin `controller` se deriva del `SimulationProvider` (simulador principal); con `controller` reproduce la línea de tiempo que se le pase (p. ej. la rama what-if), sin duplicar el bucle RAF.


**Cierra:** `§ Reproducción automática`, `§ Navegación manual`, `§ Render — PlaybackControls`, `§ Iconos SVG`,` § Tamaño consistente de botones`— `tests/react/PlaybackControls.test.tsx`

### T-43 · `<MetricsTable>`

Archivos: `MetricsTable.tsx`, `style/MetricsTable.module.css`.

Dos tablas: por proceso y agregadas. Solo visibles en el último tick.

**Cierra:** `§ Coherencia de métricas y estado`, `§ Render — MetricsTable` — `tests/react/MetricsTable.test.tsx`

### T-44 · `<ProcessForm>` (panel desplegable)

Archivos: `ProcessForm.tsx`, `style/ProcessForm.module.css`.


Archivos:
- ProcessForm.tsx.tsx
- style/ProcessForm.module.css
- icons/TrashIcon.tsx
- icons/PlusIcon.tsx

#### 1. Componentes de Iconos (Crear exactamente con este código)

- **`src/react/icons/TrashIcon.tsx`**
```tsx
export const TrashIcon = (): React.ReactElement => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
``` 
- **`src/react/icons/PlusIcon.tsx`**
```tsx
export const PlusIcon = (): React.ReactElement => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
``` 

**Edición de operaciones de E/S (solo si `requires.io`):** Cada proceso muestra una sublista editable de operaciones. Cada operación tiene `io_entry` e `io_time`.

- **Añadir operación:** control por proceso, valores por defecto, rederiva.
- **Eliminar operación:** control por operación, rederiva. Sin operaciones = solo CPU.
- **Validación individual:** `io_entry > 0 && < burst_time`; `io_time > 0`.
- **Validación de lista:** `io_entry` estrictamente crecientes.
- **Cascada:** si `burst_time` se reduce y algún `io_entry ≥ burst_time` → error.
Panel **cerrado por defecto**. Al abrir: todos los procesos con campos editables.
Rederiva al instante (sin botón Aplicar). Campos condicionales: `priority` si
`requires.priority`, `io_entry`/`io_time` si `requires.io`. Añadir/eliminar proceso.
Inyección en vivo (`arrival_time ≥ tick_actual`).

Reglas visuales de formularios:

- Inputs, selects y botones usan tokens compartidos.
- Los errores de validación usan token de error.
- Los controles deshabilitados deben ser distinguibles.
- El panel desplegable debe mostrar claramente su estado abierto/cerrado.


2. Requisitos de Implementación para <ProcessForm>
Importar los 2 componentes de iconos anteriores desde `./icons/` .
* Añadir operación 



**Cierra:** `§ ProcessForm — panel desplegable de edición de procesos` y `§ ProcessForm — edición de operaciones de E/S` — `tests/react/ProcessForm.test.tsx`

### T-45 · `<WhatIfControls>` (rama what-if)

Archivos: `WhatIfControls.tsx`, `style/WhatIfControls.module.css`.

**Visible en cualquier tick**, incluidos el tick 0 y el último (al finalizar el
simulador). No se oculta en ningún tick.

**Funcionalidad:**
- Formulario **"Comparar con otro escenario"**: elige un algoritmo y parámetros
  alternativos. El botón **"Comparar"** llama a `createWhatIf({ algorithm, params })`, que
  **rederiva el escenario completo** con `run()` y esos *overrides* (no bifurca desde el
  `SchedulerState` del tick `T`; `runFrom` queda como evolución futura — ver la nota de
  implementación en `SPECv-02.md` y `DECISIONS.md`). La rama **comparte los procesos** del
  escenario actual.
- Botón **"Descartar rama"** (visible solo dentro de una rama): restaura el escenario
  original.
- **Solo una rama a la vez:** crear una nueva descarta la anterior sin confirmación.
- Persistencia: la rama se guarda en `sessionStorage`
  (`scheduler-whatif:${algorithmName}`). Se pierde al cerrar la pestaña.

**Cableado con el Provider:** `SimulationProvider` expone por contexto:
- `createWhatIf(overrides: WhatIfOverrides): void` — crea la rama (algoritmo/parámetros alternativos).
- `discardWhatIf(): void` — descarta la rama.
- `whatIfBranch: WhatIfBranch | null` — estado de la rama activa.

**Vista de comparación (estado actual implementado):** la sección "Diagrama de Gantt"
muestra **solo el diagrama de la rama** (el del escenario actual ya está arriba en el
simulador principal) con su **propio `PlaybackControls` independiente** (prop `controller`
de T-42, `testId="whatif-playback"`), cuyo cursor `branchTick` recorre la rama completa
(rango = longitud de la rama). Las tablas de comparación (métricas por proceso y
agregadas) son siempre visibles. El componente es visible en cualquier tick `T > 0`
(incluido el último).

**Cierra:** `§ WhatIfControls — rama what-if` — `tests/react/WhatIfControls.test.tsx`

### T-46 · `<AlgorithmParamsForm>` (draft vs applied)

Archivos: `AlgorithmParamsForm.tsx`, `style/AlgorithmParamsForm.module.css`.

**Visible desde el primer render** si el algoritmo tiene parámetros. Estado `draft` vs
`applied`. Botón "Aplicar" + `validateParams`. `boostInterval` vacío = sin boost.
Reset al cambiar de algoritmo.

**Campos según el algoritmo (derivados de `requires`):**
- `requires.quantum === true` y `requires.levels !== true` (Round Robin, VRR) → un único campo `Quantum` (opcional).
- `requires.levels === true` (MLFQ) → **dos campos** `Quantum nivel 0` y `Quantum nivel 1` (ambos obligatorios, enteros `> 0`) que se emiten como `params.quanta = [q0, q1]`, más el campo opcional `Boost interval`. El `boostInterval` solo aparece en este caso, no en Round Robin / VRR.

Reglas visuales de formularios:

- Inputs, selects y botones usan tokens compartidos.
- Los errores de validación usan token de error.
- Los controles deshabilitados deben ser distinguibles.
- El panel desplegable debe mostrar claramente su estado abierto/cerrado.

**Cierra:** `§ Render — AlgorithmParamsForm` — `tests/react/AlgorithmParamsForm.test.tsx`

---

## Fase 7 — Persistencia por sesión


### T-47 · Persistencia en `sessionStorage` con clave por página

Se actualiza `SimulationProvider.tsx` para añadir los efectos secundarios de persistencia:
- Guarda/restaura el **Escenario base** bajo `scheduler-scenario:${algorithmName}`.
- Guarda/restaura la **Rama what-if** bajo `scheduler-whatif:${algorithmName}`.
- Excluye estrictamente el resultado (`SimulationResult`) del objeto guardado.

Se debe implementar la acción de `reset` que limpia el escenario actual devolviéndolo a los valores pasados por `props` inicialmente y borra ambas claves del `sessionStorage`.
Se garantiza que navegar entre páginas (`algorithmName` distinto) no mezcla los escenarios.

**Cierra:** `§ Persistencia por sesión`, `§ Escenario de ejemplo por defecto` — `tests/react/SimulationProvider.test.tsx` (se añaden los nuevos tests a la suite existente).
---

## Fase 8 — Documentación (`docs/`)

> **Prohibido crear componentes wrapper.** Las páginas `.mdx` importan directamente desde
> `'cpu-scheduler'` y componen inline.
> **Mantener `index.mdx`** con plantilla `splash` como punto de entrada.
> 

### T-48 · Guías para desarrolladores

Crear tres guías `.mdx` en el subproyecto de documentación. El agente DEBE extraer la información técnica exclusivamente de `TECHNICAL.md` y `SPECv-02.md`, sin inventar nuevas reglas.

- **Guía 1:** `01-integracion-del-componente.mdx`
  
Título visible: Integración y Uso del Componente
Objetivo: Explicar a un desarrollador cómo importar y renderizar tu simulador de CPU dentro de su propia página o aplicación React/Astro.

Estructura del contenido:

Introducción: Qué es el componente, su aislamiento (cero dependencias de servidor) y cómo funciona el modelo de pre-cálculo y reproducción visual (playback).

El SimulationProvider: Explicación del contexto global que orquesta los subcomponentes.

Subcomponentes Visuales: Breve descripción funcional de ProcessTable, GanttChart, PlaybackControls y MetricsTable.

Layouts Soportados:

Modo Panel: Todos los componentes juntos en una vista unificada.

Modo Documentación: Componentes intercalados con texto explicativo (ideal para material didáctico).
[... tu texto exacto aquí ...]

- **Guía 2:** `02-configuracion-y-escenarios.mdx`

Título visible: Configuración y Gestión de Escenarios
Objetivo: Detallar la estructura de datos de entrada, el significado de cada parámetro y cómo la interfaz gestiona la mutación del estado.

Estructura del contenido:

Definición de Procesos (Process): Qué significa arrival_time, burst_time y priority.

Modelo de Entrada/Salida (E/S): Cómo estructurar el array io (io_entry, io_time) y la restricción de que io_entry debe ser estrictamente creciente.

Configuración del Algoritmo (RunConfig):

Identificadores registrados (name).

Parámetros dinámicos: quantum, quanta (array de multinivel) y boostInterval.

Manipulación de Escenarios:

Edición Estándar: Cómo los cambios en ProcessForm y AlgorithmParamsForm disparan la rederivación instantánea.

Análisis What-If: Cómo pausar en el tick T, modificar el estado (ej. cambiar un parámetro) y rederivar una línea temporal alternativa desde ese punto.

Inyección en Vivo: Reglas para añadir un proceso durante la reproducción (validación de arrival_time >= tick).

Persistencia: Explicación técnica de cómo el escenario activo se guarda en el sessionStorage para no perder los datos al recargar la página.

- **Guía 3:** `03-crear-nuevo-algoritmo.mdx`
  
Título visible: Desarrollo de Nuevos Algoritmos
Objetivo: Servir como manual técnico estricto para extender el simulador implementando el contrato IAlgorithm, asegurando el desacoplamiento del motor principal.

Estructura del contenido:

El Contrato IAlgorithm: Explicación de las propiedades obligatorias (name, triggers, requires, select).

Patrones Arquitectónicos Permitidos:

Patrón 1 (Sin Estado): Para algoritmos clásicos como FCFS o SJF.

Patrón 2 (Con Estado Interno): Para algoritmos complejos (VRR, MLFQ) que requieren estructuras privadas (colas multinivel, mapas de tiempo sobrante).

Métodos Opcionales y su Uso:

quantumFor: Para control dinámico del tiempo (ej. devolver el sobrante en VRR o el quantum del nivel en MLFQ).

onEvent (Patrón Observador): Cómo usarlo para actualizar el estado interno y devolver fragmentos de texto (Mensajes Ricos) que el motor concatenará para la UI.

Reglas Estrictas (Guardarraíles): Prohibición de acceder al historial global, mutar la readyQueue original proporcionada por el motor, o incluir lógicas de dispositivos.

### T-49 · Página de demo FCFS,  SJF, LJF,

```mdx
<SimulationApp
  algorithm="fcfs"
  processes={[
    { id: 'P1', arrival_time: 0, burst_time: 3 },
    { id: 'P2', arrival_time: 2, burst_time: 2 },
    { id: 'P3', arrival_time: 1, burst_time: 4 },
  ]}
  client:only="react"
/>
```

### T-50 · Páginas de demo Prioridad NP
- priority-np
```mdx
<SimulationApp
  algorithm="priority-np"
  processes={[
    { id: 'P1', arrival_time: 0, burst_time: 4, priority: 2 },
    { id: 'P2', arrival_time: 1, burst_time: 3, priority: 1 },
    { id: 'P3', arrival_time: 2, burst_time: 2, priority: 3 },
    { id: 'P4', arrival_time: 3, burst_time: 5, priority: 1 },
  ]}
  client:only="react"
/>
```
### T-51 · Páginas de demo SRTF, Round Robin, Prioridad P

Round Robin con `params={{ quantum: 2 }}`.

### T-52 · Página Round Robin Virtual

Con **dos procesos con E/S** para que se note la cola auxiliar vs principal.
`AlgorithmParamsForm` visible de inicio con quantum.

```mdx
<SimulationApp
  algorithm="rrv"
  processes={[
    { id: 'A', arrival_time: 0, burst_time: 9, io: [{ io_entry: 1, io_time: 2 }, {io_entry: 5, io_time: 3}] },
    { id: 'B', arrival_time: 0, burst_time: 4 },
    { id: 'C', arrival_time: 0, burst_time: 3, io: [{ io_entry: 3, io_time: 1 }] },
    { id: 'D', arrival_time: 0, burst_time: 3, io: [{ io_entry: 2, io_time: 1 }] },
  ]}
  params={{ quantum: 4 }}
  client:only="react"
/>
```

### T-53 · Página MLFQ

Escenario solo CPU. `AlgorithmParamsForm` con `quanta` y `boostInterval` visibles de inicio.

```mdx
<SimulationApp
  algorithm="mlfq"
  processes={[
    { id: 'A', arrival_time: 0, burst_time: 3 },
    { id: 'B', arrival_time: 1, burst_time: 2 },
    { id: 'C', arrival_time: 3, burst_time: 4 },
    { id: 'D', arrival_time: 4, burst_time: 2 },
    { id: 'E', arrival_time: 7, burst_time: 5 },
    { id: 'F', arrival_time: 9, burst_time: 3 },
  ]}
  params={{ quanta: [2, 3] }}
  client:only="react"
/>
```

---

## Fase 9 — Refinamiento estético y revisión visual

### T-54 · Revisión visual final sin redefinir tokens


Revisar que todos los componentes usan los tokens definidos en T-37.

No se permite introducir nuevos colores literales, nuevos tamaños ad hoc ni iconos externos.

Ajustar únicamente:
- consistencia de espaciados;
- alineación;
- legibilidad;
- contraste;
- estados hover/focus/disabled;
- coherencia entre leyenda y Gantt;
- coherencia entre tablas y formularios.

**Espaciado parásito de Starlight (regla obligatoria).** El componente se renderiza dentro
de `.sl-markdown-content`, cuyo auto-espaciado de prosa inyecta un `margin-top` a todo
hermano que no sea el primero (ver *«Estética: integración del componente dentro de
Starlight»* en `TECHNICAL.md`). Esto hace que, en cualquier fila de hermanos
(botones de `PlaybackControls`, ítems de leyenda de `GanttChart`, etc.), el **primer
elemento quede más arriba que el resto**. Regla: cada ítem de un grupo flex/grid debe
resetear `margin: 0` en su CSS Module y el espaciado se controla con `gap` en el
contenedor — nunca confiando en el flujo vertical del navegador. Prohibido usar la clase
`.not-content` de Starlight (acoplaría el módulo publicable al tema de docs).

#### Desplegables colapsables con chevron (icono propio)

Los paneles `<details>`/`<summary>` (`MetricsTable`, las tres secciones internas del
`WhatIfControls` y su panel raíz, y el toggle de `ProcessForm`) muestran un **chevron SVG
propio** como indicador de estado: **apunta hacia abajo cuando está cerrado y hacia arriba
cuando está abierto** (rotación de 180° por CSS, no se cambia de icono). Queda prohibido
usar caracteres Unicode o emojis para la flecha.

Archivos:
- icons/ChevronIcon.tsx
- style/MetricsTable.module.css
- style/WhatIfControls.module.css
- style/ProcessForm.module.css

##### Componente de icono (Crear exactamente con este código)

- **`src/react/icons/ChevronIcon.tsx`**
```tsx
export const ChevronIcon = (): React.ReactElement => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
```

##### Requisitos de implementación

- Importar `ChevronIcon` desde `./icons/` y colocarlo **dentro** del `<summary>` (o del
  botón toggle en `ProcessForm`), antes del texto. El tamaño se controla con `width/height: 1.1em`.
- La rotación a estado abierto se hace por CSS, sin estado extra en React:
  - `<details>`: `.<contenedor>[open] > .<summary> svg { transform: rotate(180deg); }`.
  - `ProcessForm` (toggle controlado): `.toggle[aria-expanded='true'] svg { transform: rotate(180deg); }`.
- **Marcador de Starlight:** Starlight inyecta su propio chevron en `summary::before`
  (regla dentro de `@layer starlight.content`). Para que solo se vea nuestro icono, cada
  CSS Module oculta ese pseudo-elemento con `.<summary>::before { display: none; }`. La
  regla gana por ser **unlayered** (mismo mecanismo que el reset de margen parásito; ver
  `TECHNICAL.md`), **no** por especificidad — prohibido usar `!important` o `.not-content`.

**Verificación:**
- Todos los tests de render siguen verdes.
- No hay colores literales duplicados fuera de tokens.
- El modo claro y el modo oscuro mantienen contraste suficiente.
- El primer elemento de cada fila de hermanos (botones, leyenda) queda alineado con el
  resto al embeberse en una página de Starlight.

---

## Fase 10 — Verificación final

### T-55 · Cobertura completa de `BEHAVIOURSv-02.md`

Cada criterio tiene al menos un test que pasa.

### T-56 · Typecheck y lint limpios

`typecheck` y `lint` sin warnings; `astro check` sin errores en `docs/`.

### T-57 · Build de producción

`npm run build` genera la librería; `npm run docs:build` genera el sitio. En
`docs:preview`: se ven los mensajes ricos de VRR y MLFQ, los estados de E/S en el
Gantt, la contención, las métricas coherentes, la persistencia por sesión, la edición
desde ProcessForm y AlgorithmParamsForm.

---

## Dependencias entre fases

```
```text
Fase 0 (T-00, T-01)
  └─► Fase 1 (T-02 … T-07)
        └─► Fase 2 (T-08)
              └─► Fase 3 (T-09 … T-24)
                    ├─► Fase 4 (T-25)
                    │     └─► Fase 6 (T-37 … T-46) ─► Fase 7 (T-47)
                    │           └─► Fase 8 (T-48 … T-53) ─► Fase 9 (T-54)
                    │                 └─► Fase 10 (T-55 … T-57)
                    └─► Fase 5 (T-26 … T-36) ← paralelos entre sí
```

---

## Trazabilidad BEHAVIOURSv-02 ↔ tareas

| Criterio `BEHAVIOURSv-02.md` | Tarea(s) |
|-------------------------------|----------|
| Registro de algoritmos | T-08 |
| CPU inactiva | T-09 |
| Determinismo sin E/S | T-10 |
| Simular — FCFS | T-11, T-27 |
| Simular — SRTF | T-12, T-31 |
| Simular — Round Robin | T-13, T-33 |
| Contención del dispositivo de E/S | T-14 |
| Orden intra-tick y empate ráfaga/quantum | T-15 |
| Determinismo con E/S (VRR) | T-16, T-34 |
| Determinismo con niveles (MLFQ) | T-17, T-35 |
| Mensajes ricos — `HistoryEvent.message` | T-18 |
| Historial y métricas | T-19 |
| Coherencia de métricas y estado | T-20, T-43 |
| Rederivación — what-if e inyección | T-21, T-22 |
| Conjunto vacío | T-23, T-38 |
| Validación de configuración | T-23 |
| Seguridad y tolerancia a fallos | T-23 |
| Simulador independiente de la vista | T-24 |
| Estructura del resultado de simulación | T-24 |
| Navegación manual | T-25, T-42 |
| Utilidad FifoQueue | T-26|
| Algoritmos clásicos — solo CPU | T-27…T-33 |
| Simular — SJF (no expropiativo) | T-28 |
| Simular — LJF (no expropiativo) | T-29 |
| Simular — Prioridad (no expropiativa) | T-30 |
| Simular — Prioridad (P) | T-32 |
| Simular — Round Robin Virtual (expropiativa) | T-34 |
| Simular — MLFQ (expropiativa) | T-35 |
| Contrato de algoritmo (extensibilidad) | T-36 |
| Verificación de contrato de algoritmo (Extensibilidad) | T-36 |
| Escenario de ejemplo por defecto | T-38, T-39 , T-44, T-47 |
| Persistencia por sesión | T-47 |
| Render — SimulationProvider | T-38, T-40 |
| Render — SimulationApp (Orquestador Visual)| T-39 |
| Página de algoritmo y campos declarados | T-40, T-50, T-51 |
| Render — ProcessTable | T-40 |
| Render — GanttChart | T-41 |
| Iconos SVG | T-42 |
| Tamaño consistente de botones | T-42 |
| Reproducción automática | T-42 |
| Render — PlaybackControls | T-42 |
| Render — MetricsTable | T-43 |
| ProcessForm — panel desplegable de edición de procesos | T-44 | 
| ProcessForm — edición de operaciones de E/S | T-44 |
| WhatIfControls — rama what-if | T-45 |
| Render — `AlgorithmParamsForm` | T-46 |

---

## Mejora posterior — mensajes descriptivos en algoritmos clásicos

Ampliación sobre T-18/T-27…T-35: FCFS, SJF, LJF, Prioridad (NP y P), SRTF y Round Robin
implementan `onEvent()` **solo para mensajería** (Round Robin, además, mantiene su cola FIFO),
memorizando en `select()` el dato de la decisión (ráfaga, tiempo restante, prioridad o cabeza
de cola) y devolviéndolo en `dispatch` (y en `preempted` / `quantum-expiry` según el algoritmo)
con la forma `{ text }`, exactamente igual que VRR/MLFQ. El motor, los tipos, los triggers y el
sistema de eventos **no se tocan**; `select()` es idéntico, por lo que Gantt y métricas no cambian.
Solo cambia el texto de `HistoryEvent.message`. Verificación: `npm run lint` + `npm run typecheck`
+ `npm test`, con un test de `message` por algoritmo (fixtures en `§ Mensajes ricos`).

## Hito de cierre

v02 está terminada cuando T-56 y T-57 (lint/build final) pasan: los 9 algoritmos verificados contra sus fixtures, subsistema de E/S con contención, mensajes ricos, edición desde la demo (ProcessForm + AlgorithmParamsForm), rederivación what-if con `WhatIfControls` e inyección en vivo, persistencia por sesión (escenario base + rama what-if), estética con tokens de diseño, arquitectura UI desacoplada mediante `SimulationApp`, y `docs/` con las guías y un ejemplo por algoritmo.