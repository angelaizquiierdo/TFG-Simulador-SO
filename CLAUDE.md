# CLAUDE.md — Guía para el agente

Este archivo orienta al agente que ejecuta `specs/v-01/PLAN.MD` tarea a tarea.
Léelo completo antes de tocar código.

---

## 1. Qué es este proyecto

Un **simulador de planificación de CPU** para uso didáctico.
Se construye como una **librería TypeScript + componente React** consumida por un sitio
de documentación Astro + Starlight.

No es una aplicación standalone: es un módulo publicable que otros proyectos pueden
embeber. Las páginas de Astro son solo la demo.

---

## 2. Documentos de referencia (leerlos antes de cada tarea)

| Archivo | Qué contiene |
|---|---|
| `specs/v-01/SPECv-01.md` | Qué debe hacer el producto (funcionalidades, modelo de datos, casos límite) |
| `specs/TECHNICAL.md` | Arquitectura, stack, contratos exactos (`IAlgorithm`, `History`), restricciones |
| `specs/v-01/BEHAVIOURSv-01.md` | Criterios de aceptación Given/When/Then — cada uno debe tener un test |
| `specs/v-01/PLAN.MD` | Hoja de ruta: fases y tareas atómicas con su verificación |
| `specs/DECISIONS.md` | Decisiones de diseño ya tomadas — no reabrir sin motivo |

---

## 3. Estructura de carpetas canónica

No crear archivos fuera de estas rutas:

```
src/
  core/                  ← TypeScript puro. CERO dependencias de React o DOM.
    types/
      process.ts         ← Process, ReadyProcess
      algorithm.ts       ← PreemptionMode, IAlgorithm
      history.ts         ← HistoryEvent, History, Interval
      simulation-result.ts ← ProcessMetrics, AggregateMetrics, SimulationResult
    registry.ts          ← register() y get()
    simulate.ts          ← run() — el motor
    player.ts            ← Player — cursor sobre History
    algorithms/
      non-preemptive/    ← fcfs.ts, sjf.ts, ljf.ts, priority-np.ts
      preemptive/        ← srtf.ts, priority-p.ts, round-robin.ts
  react/                 ← Componentes React. Puede importar src/core; nunca al revés.
    Simulator.tsx
    GanttChart.tsx
    PlaybackControls.tsx ← ÚNICO lugar con requestAnimationFrame y deltaTime
    MetricsTable.tsx
  style/
    *.module.css

tests/
  core/                  ← Vitest, entorno Node
  react/                 ← Vitest + Testing Library, entorno jsdom

docs/                    ← Subproyecto Astro + Starlight. package.json propio.
  src/content/docs/cpu-scheduler/
    non-preemptive/      ← fcfs.mdx, sjf.mdx, ljf.mdx, prio-n.mdx
    preemptive/          ← round-robin.mdx, srtf.mdx, prio-p.mdx
```

---

## 4. Reglas de arquitectura — las más importantes

Estas fronteras las fuerza ESLint. Violarlas hace fallar `npm run lint`.

| Desde | Puede importar | NO puede importar |
|---|---|---|
| `src/core/**` | Solo otros módulos de `src/core/` | React, DOM, `src/react/**` |
| `src/core/algorithms/**` | Solo `src/core/types/algorithm.ts` | Cualquier otra cosa de core |
| `src/react/**` | `src/core/**`, React | — |
| `docs/**` | El módulo publicado, Astro/Starlight | `src/react/**` directamente |

**La dependencia va en una sola dirección:** `docs → react → core`. Nunca al revés.

---

## 5. Contratos fijos — no cambiar los nombres

Estos tipos y firmas están acordados con la spec. Si necesitas cambiarlos, actualiza
`specs/TECHNICAL.md` y `specs/DECISIONS.md` primero y explica por qué.

```ts
// src/core/types/algorithm.ts
type PreemptionMode = 'none' | 'on-better' | 'on-quantum';

interface ReadyProcess {
  readonly id: string;
  readonly arrival_time: number;
  readonly burst_time: number;
  readonly remaining: number;
  readonly priority?: number;
}

interface IAlgorithm {
  name: string;
  preemptionMode: PreemptionMode;
  requires: { priority?: boolean; quantum?: boolean };
  select(ready: readonly ReadyProcess[]): ReadyProcess;
}
```

```ts
// src/core/types/history.ts
interface HistoryEvent {
  readonly tick:        number;
  readonly onCPU:       string | null;   // null = CPU inactiva
  readonly ready:       readonly string[];
  readonly pending:     readonly string[];
  readonly completed:   readonly string[];
  readonly message:     string;
}
type History = readonly HistoryEvent[];

interface Interval {
  readonly pid:   string | null;   // null = hueco de inactividad
  readonly start: number;
  readonly end:   number;
}
```

```ts
// src/core/types/simulation-result.ts
// SimulationResult = { history; intervals; metrics }
// intervals y metrics se DERIVAN del history con funciones puras.
// No se acumulan durante el bucle del motor.
```

---

## 6. Prohibiciones absolutas en `src/core/`

- ❌ `Math.random()` — el simulador debe ser determinista.
- ❌ `Date.now()` / `new Date()` — ídem.
- ❌ `any` implícito o explícito.
- ❌ Acumular `intervals` o `metrics` dentro del bucle de `run()` — se derivan al final con funciones puras.
- ❌ `requestAnimationFrame` / `setTimeout` / `deltaTime` — solo en `PlaybackControls.tsx`.
- ❌ Lógica del motor dentro de un algoritmo (historial, mensajes, métricas) — los algoritmos solo implementan `select()`.

---

## 7. Convenciones de nombrado

- **Identificadores en el código:** inglés (`Process`, `arrival_time`, `select`, `preemptionMode`…).
- **Prosa, comentarios, mensajes de commit y documentación:** español.
- **Nombres de archivo:** kebab-case (`priority-np.ts`, `round-robin.ts`).
- **Componentes React:** PascalCase (`GanttChart.tsx`).

---

## 8. Protocolo antes de cerrar una tarea

Antes de marcar una tarea del `PLAN.MD` como terminada y pasar a la siguiente:

1. `npm run lint` — sin errores ni warnings.
2. `npm run typecheck` — sin errores.
3. `npm test` — todos los tests pasan, incluidos los de la tarea recién completada.
4. Si la tarea añade un algoritmo o funcionalidad nueva → actualizar su página en `docs/` **en el mismo commit**.

Si alguno falla, corregirlo antes de continuar. No avanzar con tests en rojo.

---

## 9. Scripts disponibles

```bash
npm run lint        # ESLint sobre todo el proyecto
npm run typecheck   # tsc --noEmit (proyecto principal)
npm test            # Vitest (core + react)

# Dentro de docs/
cd docs
npm run typecheck   # astro check
npm run build       # build estático
```

---

## 10. Tests y criterios de aceptación

Cada criterio de `specs/v-01/BEHAVIOURSv-01.md` debe tener **al menos un test** en `tests/`.

- Tests del motor y algoritmos → `tests/core/` (entorno Node, sin DOM).
- Tests de componentes → `tests/react/` (entorno jsdom, Testing Library).

Cuando el PLAN.MD diga **"Cierra § X"**, significa que el test que implementa ese criterio
debe estar en ese commit y pasar en verde.

---

## 11. Cómo añadir un algoritmo nuevo (para no tocar el motor)

1. Crear una clase en `src/core/algorithms/(non-preemptive|preemptive)/nombre.ts`.
2. Implementar `IAlgorithm` (`name`, `preemptionMode`, `requires`, `select()`).
3. Registrarla en `src/core/registry.ts` con `register(new MiAlgoritmo())`.
4. Añadir un test en `tests/core/algorithms/` con el fixture de `BEHAVIOURSv-01.md`.
5. Añadir o actualizar su página en `docs/src/content/docs/cpu-scheduler/`.

**No modificar `simulate.ts`, `player.ts` ni ningún componente React.**

---

## 12. Errores frecuentes que debe evitar el agente

| Error | Síntoma | Solución |
|---|---|---|
| Importar React desde `core` | `lint` falla con "boundary violation" | Mover el código a `src/react/` |
| Usar `any` en tipos | `typecheck` falla con `noImplicitAny` | Tipar correctamente |
| Acceder a `history[i]` sin guard | `typecheck` falla con `noUncheckedIndexedAccess` | Comprobar `!== undefined` antes de usar |
| Acumular intervalos en el bucle | Lógica duplicada, difícil de testear | Usar `deriveIntervals(history)` al final de `run()` |
| Mezclar lógica de motor en un algoritmo | Rompe el patrón Strategy | El algoritmo solo implementa `select()` |
| Crear archivos fuera de la estructura | El proyecto crece de forma caótica | Ver sección 3 |
| Olvidar actualizar `docs/` | Documentación desfasada | Regla: funcionalidad + docs en el mismo commit |
