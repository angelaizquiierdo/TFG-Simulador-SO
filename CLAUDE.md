# CLAUDE.md — Instrucciones para el Agente de IA

> **Modelo:** Claude Sonnet 4.6 (`claude-sonnet-4-6`)
> **Modo de uso:** Claude Code (`claude --model claude-sonnet-4-6`) o API con este archivo como system prompt.
> **Propósito:** guiar la ejecución tarea a tarea de `specs/PLAN.MD`.
> Lee este archivo completo antes de tocar ningún archivo del proyecto.

---

## 1. Qué es este proyecto

Un **simulador de planificación de CPU** de uso didáctico, construido como
**librería TypeScript + componente React** consumida por un sitio de documentación
Astro + Starlight.

No es una aplicación standalone: es un módulo publicable que otros proyectos
pueden instalar como dependencia. Las páginas de Astro son solo la demo.

---

## 2. Documentos de referencia

Lee los documentos relevantes **antes de implementar cada tarea**. No los memorices:
consúltalos en cada tarea para no asumir.

| Archivo | Qué contiene |
|---|---|
| `specs/SPECv-01.md` | Qué debe hacer el producto (funcionalidades, modelo de datos, casos límite) |
| `specs/TECHNICAL.md` | Arquitectura, stack, contratos exactos (`IAlgorithm`, `History`), restricciones |
| `specs/BEHAVIOURS-v01.md` | Criterios de aceptación — cada uno debe tener un test |
| `specs/PLAN.MD` | Hoja de ruta: fases y tareas atómicas con su verificación |

---

## 3. Principios de comportamiento — leer antes de cada tarea

Estas tres reglas tienen **prioridad sobre cualquier otra consideración**.

### 3.1 Simplicidad primero

- Implementa la solución **más simple** que satisfaga la verificación de la tarea.
- Si la verificación pasa con 10 líneas, no escribas 50 "por si acaso".
- No añadas abstracciones, tipos genéricos, helpers o utilidades que la tarea no
  requiera explícitamente.
- No crees interfaces adicionales: las interfaces están definidas en los contratos
  fijos (sección 6). Úsalas tal cual.
- No anticipes tareas futuras: cada tarea es autocontenida. Lo que vendrá después
  lo resuelve la tarea de después.

### 3.2 Cambios quirúrgicos

- Cada tarea tiene un **conjunto pequeño y definido de archivos** a tocar. Antes de
  editar cualquier archivo, confirma que la tarea lo requiere.
- **No reformatees, no reorganices imports, no apliques cambios de estilo** que ESLint
  no exija explícitamente. Si ESLint pasa, el estilo está bien.
- **No refactorices código de tareas anteriores** mientras ejecutas la actual. Si ves
  un problema externo al alcance de la tarea, añade un comentario `// TODO: [descripción]`
  y sigue. No lo arregles ahora.
- Usa **ediciones dirigidas** (reemplazar un bloque concreto) en vez de reescrituras
  completas de archivos que ya existen.
- Si un archivo ya existe y solo necesitas añadirle una función, añade esa función y
  **nada más**.
- Si cambiar algo obliga a tocar un archivo no mencionado en la tarea, detente y
  explica por qué antes de proceder.

### 3.3 Verificación obligatoria

- **Nunca declares una tarea terminada** sin haber ejecutado y visto pasar los tres
  comandos de verificación.
- Si un comando falla, corrige el código de producción y repite. No avances.
- **No modifiques tests para hacerlos pasar**: si un test falla, el error está en el
  código de producción, no en el test.
- **No uses `.skip`, `.todo` ni `vi.mock()` para esquivar** un test que debería pasar.
- Si la verificación no puede pasar y no encuentras la causa, aplica la regla de los
  3 strikes (sección 3.4) y detente.

### 3.4 Límite de reintentos — Anti-Doom Loop

- **Regla de los 3 strikes:** si ejecutas un comando de verificación (`lint`, `typecheck`
  o `test`) y falla, tienes un máximo de **2 intentos** para corregir el código y volver
  a probar.
- Si al segundo intento el error persiste, **DETENTE INMEDIATAMENTE**. No descargues
  paquetes de npm para analizar su código fuente, no reescribas configuraciones globales,
  ni intentes métodos alternativos.
- Imprime el error exacto en la terminal y comunica:
  > "He fallado 2 veces intentando arreglar [X]. Necesito intervención manual."

---

## 4. Protocolo de ejecución de una tarea

Sigue este orden en cada tarea. **No saltes pasos.**

```
① Lee el enunciado completo de la tarea en specs/PLAN.MD.
① bis Si algo del enunciado es ambiguo, pregunta ANTES de escribir código.
      No asumas — una suposición incorrecta aquí invalida todos los pasos siguientes.
② Identifica exactamente qué archivos menciona la tarea.
③ Lee las secciones relevantes de SPECv-01.md y TECHNICAL.md.
④ Lee el criterio de BEHAVIOURS-v01.md que la tarea "Cierra".
⑤ Implementa SOLO lo que la tarea describe, en los archivos que menciona.
⑥ Escribe o verifica el test que la tarea requiere.
⑦ Ejecuta: npm run lint → npm run typecheck → npm test
⑧ Si algo falla → corrige el código → vuelve al paso ⑦.
   Máximo 2 reintentos; si el error persiste, aplica la regla 3.4 y detente.
⑨ Si la tarea añade un algoritmo o funcionalidad → actualiza docs/ en el mismo cambio.
⑩ Al terminar la FASE completa (no la tarea): git commit -m "fase-N: descripción breve"
```

**Nunca combines dos tareas en un solo paso**, aunque parezcan relacionadas.
**El commit es por fase**, no por tarea. Mientras la fase no esté completa, no hay commit.

---

## 5. Estructura de carpetas canónica

No crear archivos fuera de estas rutas. Si una tarea requiere un archivo en una ruta
distinta, consulta la spec antes de crearlo.

```
cpu-scheduler-simulator/   ← raíz del proyecto
  specs/                   ← documentación SDD (no es código)
    v-01/
      SPECv-01.md
      BEHAVIOURSv-01.md
      PLAN.md
    TECHNICAL.md
    DECISIONS.md
    CLAUDE.md              ← este archivo
  src/                     ← EL MÓDULO: simulador + componente (ambos aquí)
    core/                  ← Simulador. TypeScript puro. CERO dependencias de React o DOM.
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
    react/                 ← Componentes React. Consume src/core vía contexto; nunca al revés.
      SimulationContext.ts ← contexto + hook useSimulation()
      SimulationProvider.tsx ← proveedor: llama a run(), expone contexto
      ProcessTable.tsx     ← lee procesos del contexto
      GanttChart.tsx       ← matriz sincronizada con el tick actual del Player
      PlaybackControls.tsx ← ÚNICO lugar con requestAnimationFrame y deltaTime
      MetricsTable.tsx     ← lee metrics del contexto
      style/               ← CSS Modules, un .module.css por componente visual
        SimulationProvider.module.css
        ProcessTable.module.css
        GanttChart.module.css
        PlaybackControls.module.css
        MetricsTable.module.css
    index.ts               ← punto de entrada del módulo publicable

  tests/                   ← espejo de src/ — un .test.ts por cada .ts
    core/                  ← Vitest, entorno Node
      registry.test.ts
      simulate.test.ts
      player.test.ts
      algorithms/
        non-preemptive/    ← fcfs.test.ts, sjf.test.ts, ljf.test.ts, priority-np.test.ts
        preemptive/        ← srtf.test.ts, round-robin.test.ts, priority-p.test.ts
        contracts.test.ts
    react/                 ← Vitest + Testing Library, entorno jsdom
      SimulationProvider.test.tsx, ProcessTable.test.tsx,
      GanttChart.test.tsx, PlaybackControls.test.tsx, MetricsTable.test.tsx
      style/
        *.module.css

  docs/                    ← Subproyecto Astro + Starlight. SOLO la demo de visualización.
    src/                   ← No contiene simulador ni componente. Importa el módulo.
      content/docs/cpu-scheduler/
        non-preemptive/    ← fcfs.mdx, sjf.mdx, ljf.mdx, prio-n.mdx
        preemptive/        ← round-robin.mdx, srtf.mdx, prio-p.mdx
    astro.config.mjs
    package.json           ← depende del módulo como dependencia
    tsconfig.json
```

---

## 6. Reglas de arquitectura — las fuerza ESLint

Violarlas hace fallar `npm run lint`. Son innegociables.

| Desde | Puede importar | NO puede importar |
|---|---|---|
| `src/core/**` | Solo otros módulos de `src/core/` | React, DOM, `src/react/**` |
| `src/core/algorithms/**` | Solo `src/core/types/algorithm.ts` | Cualquier otra cosa de core |
| `src/react/**` | `src/core/**`, React | — |
| `docs/**` | El módulo publicado, Astro/Starlight | `src/react/**` directamente |

**La dependencia va en una sola dirección:** `docs → react → core`. Nunca al revés.

---

## 7. Contratos fijos — no cambiar los nombres sin actualizar la spec

Estos tipos y firmas están acordados. Si necesitas cambiarlos, actualiza
`specs/TECHNICAL.md` primero y explica el motivo.

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
  readonly name: string;
  readonly preemptionMode: PreemptionMode;
  readonly requires: { priority?: boolean; quantum?: boolean };
  select(ready: readonly ReadyProcess[]): ReadyProcess;
}
```

```ts
// src/core/types/history.ts
interface HistoryEvent {
  readonly tick:      number;
  readonly onCPU:     string | null;   // null = CPU inactiva
  readonly ready:     readonly string[];
  readonly pending:   readonly string[];
  readonly completed: readonly string[];
  readonly message:   string;
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
interface ProcessMetrics {
  readonly id: string;
  readonly completion: number;
  readonly turnaround: number;
  readonly waiting: number;
  readonly response: number;
}
interface AggregateMetrics {
  readonly avgWaiting: number;
  readonly avgTurnaround: number;
  readonly cpuUtilization: number;
  readonly throughput: number;
}
// SimulationResult = { history; intervals: Interval[]; metrics }
// intervals y metrics se DERIVAN del history con funciones puras al final de run().
// Nunca se acumulan dentro del bucle del motor.
```

---

## 8. Prohibiciones absolutas en `cpu-scheduler-simulator/src/core/`

```
❌ Math.random()            — el simulador debe ser determinista
❌ Date.now() / new Date()  — ídem
❌ any implícito o explícito
❌ Acumular intervals o metrics dentro del bucle de run() — se derivan al final
❌ requestAnimationFrame / setTimeout / deltaTime — solo en PlaybackControls.tsx
❌ Lógica del motor en un algoritmo (historial, mensajes, metrics)
   → los algoritmos solo implementan select()
❌ Importar desde src/react/ — frontera de arquitectura forzada por ESLint
❌ CSS complejo, sistemas de diseño o librerías de UI no especificadas
   → en v1 los estilos no están definidos; usar CSS mínimo funcional:
      legible, usable y sin diseño elaborado. El diseño visual es trabajo de v2.
```

---

## 9. Comportamientos prohibidos del agente

```
❌ Marcar una tarea como terminada sin ejecutar lint + typecheck + test
❌ Modificar tests para hacerlos pasar en vez de corregir el código de producción
❌ Usar .skip / .todo para esquivar un test que debe pasar
❌ Combinar dos tareas en un solo paso
❌ Editar archivos no mencionados en la tarea sin justificarlo primero
❌ Añadir dependencias npm no mencionadas en la tarea sin consultarlo
❌ Reescribir un archivo completo cuando solo hay que añadir una función
❌ Anticipar tareas futuras implementando código que la tarea actual no requiere
❌ Cambiar los nombres de los contratos fijos (sección 7) sin actualizar la spec
❌ Avanzar a la siguiente tarea con tests en rojo
❌ Crear componentes wrapper (SimulatorDemo, SimulatorLayout, etc.) para las páginas
   de docs/ → importar directamente desde 'cpu-scheduler' en los .mdx
❌ Ejecutar `npm audit fix`, `npm update` o modificar versiones en `package.json`
❌ Modificar archivos de configuración estructurales (`tsconfig.json`,
   `eslint.config.js`, `vite.config.ts`, `vitest.workspace.ts`) a menos que
   la tarea lo exija de forma literal y explícita
```

---

## 10. Convenciones de nombrado

| Qué | Convención | Ejemplo |
|---|---|---|
| Tipos, interfaces, clases | PascalCase, inglés | `IAlgorithm`, `HistoryEvent` |
| Funciones, métodos, campos | camelCase, inglés | `select()`, `preemptionMode` |
| Campos de proceso (snake_case) | snake_case, inglés | `arrival_time`, `burst_time` |
| Archivos de módulo | kebab-case | `priority-np.ts`, `round-robin.ts` |
| Componentes React | PascalCase | `GanttChart.tsx` |
| Prosa, comentarios, commits | español | `// Devuelve el proceso con menor ráfaga` |

---

## 11. Checklist antes de cerrar una tarea

No pasar a la siguiente tarea hasta que los tres primeros puntos estén en verde.
El commit solo ocurre cuando la fase completa está terminada.

```
□ 1. npm run lint          → sin errores ni warnings
□ 2. npm run typecheck     → sin errores
□ 3. npm test              → todos los tests pasan (incluidos los de esta tarea)
□ 4. docs/ actualizado     → si la tarea añadió un algoritmo o funcionalidad
□ 5. [solo al cerrar fase] npm run test:coverage → src/core ≥ 90 % líneas/funciones,
                              ≥ 80 % ramas; src/react ídem
□ 6. [solo al cerrar fase] git commit -m "fase-N: descripción breve"
```

Mensajes de commit por fase (breves, sin más):
`fase-0: andamiaje` · `fase-1: tipos` · `fase-2: registry` · `fase-3: motor` ·
`fase-4: player` · `fase-5: algoritmos` · `fase-6: componente` · `fase-7: docs` ·
`fase-8: verificacion`

Si el punto 3 falla porque un test anterior rompió con el nuevo código, arréglalo
antes de continuar. El conjunto completo de tests debe pasar siempre.

Formato de reporte al completar una tarea (no al hacer commit):

```
T-XX terminada.
Lint ✓ · Typecheck ✓ · Tests ✓ (N passing)
Archivos tocados: [lista]
Cierra: [criterio BEHAVIOURS, si aplica]
```

---

## 12. Scripts disponibles

```bash
# En la raíz del proyecto principal
npm run lint            # ESLint sobre src/ y tests/
npm run typecheck       # tsc --noEmit
npm test                # Vitest (core + react)
npm run test:coverage   # Vitest con cobertura (src/core + src/react)
npm run build           # construye la librería (dist/)

# En docs/
cd docs
npm run typecheck       # astro check
npm run build           # build estático del sitio
```

---

## 13. Tests y criterios de aceptación

Cada criterio de `specs/BEHAVIOURS-v01.md` debe tener **al menos dos tests**.

Los tests del motor son los más valiosos: usa fixtures numéricos concretos sacados
directamente de `BEHAVIOURS-v01.md` (diagramas de Gantt, métricas). Si el fixture
pasa, la lógica es correcta.

### Organización de archivos de test

**Un archivo de test por cada fichero fuente.** Si varias tareas añaden tests para el
mismo fichero fuente, **editan el mismo archivo de test** — no crean uno nuevo.

```
tests/core/                                    # espejo de src/core/
  registry.test.ts                             # ← src/core/registry.ts
  simulate.test.ts                             # ← src/core/simulate.ts (T-07 a T-15)
  player.test.ts                               # ← src/core/player.ts
  algorithms/
    non-preemptive/                            # espejo de src/core/algorithms/non-preemptive/
      fcfs.test.ts                             # ← fcfs.ts
      sjf.test.ts                              # ← sjf.ts
      ljf.test.ts                              # ← ljf.ts
      priority-np.test.ts                      # ← priority-np.ts
    preemptive/                                # espejo de src/core/algorithms/preemptive/
      srtf.test.ts                             # ← srtf.ts
      round-robin.test.ts                      # ← round-robin.ts
      priority-p.test.ts                       # ← priority-p.ts
    contracts.test.ts                          # T-24: extensibilidad

tests/react/                                   # espejo de src/react/
  SimulationProvider.test.tsx                  # ← SimulationProvider.tsx
  ProcessTable.test.tsx                        # ← ProcessTable.tsx
  GanttChart.test.tsx                          # ← GanttChart.tsx
  PlaybackControls.test.tsx                    # ← PlaybackControls.tsx
  MetricsTable.test.tsx                        # ← MetricsTable.tsx
```

Ejemplo: T-07 crea `simulate.test.ts`; T-08 añade tests al mismo archivo; T-09 añade
más tests al mismo archivo. Al llegar a T-15, `simulate.test.ts` acumula todos los
tests del motor.

### Umbrales de cobertura (`npm run test:coverage`)

| Carpeta | lines | functions | statements | branches |
|---|---|---|---|---|
| `src/core/` | 90 % | 90 % | 90 % | 80 % |
| `src/react/` | 90 % | 90 % | 90 % | 80 % |

Los tests de `BEHAVIOURS-v01.md` cubren prácticamente todas las rutas de `src/core/`
(7 algoritmos + motor + player + casos límite). Para `src/react/` la cobertura
proviene de los tests de componente de T-25 a T-29; las ramas de renderizado
condicional son las más difíciles de alcanzar.

**No aumentes la cobertura añadiendo tests triviales** (getters, constantes, paths que
no ejecuta nadie en producción). Si no llegas al umbral, notifica exactamente qué
líneas o ramas no están cubiertas e **interrumpe antes de continuar** con la siguiente
tarea.

---

## 14. Cómo añadir un algoritmo nuevo

1. Crear `src/core/algorithms/(non-preemptive|preemptive)/nombre.ts`.
2. Implementar `IAlgorithm`: `name`, `preemptionMode`, `requires`, `select()`.
3. Registrarlo en el punto de entrada principal (`src/index.ts`) con `register(new NombreAlgoritmo())`, NUNCA directamente dentro de `registry.ts`.
4. Añadir test en `tests/core/algorithms/(non-preemptive|preemptive)/nombre.test.ts`
   con el fixture de `BEHAVIOURS-v01.md`.
5. Añadir o actualizar su página en `docs/src/content/docs/cpu-scheduler/`.

**No modificar `simulate.ts`, `player.ts` ni ningún componente React.**

---

## 15. Errores frecuentes y cómo evitarlos

| Error | Síntoma | Solución |
|---|---|---|
| Importar React desde `core` | `lint` falla con "boundary violation" | Mover el código a `src/react/` |
| Usar `any` | `typecheck` falla con `noImplicitAny` | Tipar correctamente con los contratos fijos |
| Acceder a `history[i]` sin guard | `typecheck` falla con `noUncheckedIndexedAccess` | Comprobar `!== undefined` antes de usar |
| Acumular `intervals` en el bucle | Lógica duplicada y difícil de testear | Usar `deriveIntervals(history)` al final de `run()` |
| Mezclar lógica del motor en un algoritmo | Rompe el patrón Strategy | El algoritmo solo implementa `select()` |
| Crear archivos fuera de la estructura | El proyecto crece de forma caótica | Ver sección 5 |
| Olvidar actualizar `docs/` | Documentación desfasada | Regla: funcionalidad + docs en el mismo commit |
| Reescribir un archivo entero | Cambios innecesarios que rompen otros tests | Edición quirúrgica: cambia solo lo que la tarea pide |
| Combinar dos tareas | Difícil de revertir si algo falla | Una tarea = un conjunto de verificaciones = un commit |
| Marcar tarea terminada sin verificar | Tests en rojo que se acumulan | Ejecutar siempre los tres comandos antes de reportar |

---
**Nota**: El proyecto ya se encuentra en el filesystem nativo de Linux, por lo que los comandos typecheck y lint deberían ejecutarse en segundos. Si hay un timeout excesivo, sígnifica que hay un bucle infinito o un error grave en el código, repórtalo.