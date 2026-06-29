# Informe — Análisis What-if: estado previo, diseño e implementación

**Fecha:** 2026-06-29 · **Rama:** `dev-what-if` (creada desde `dev-02`)
**Ámbito:** funcionalidad *what-if* del simulador (`WhatIfControls`)

---

## 1. Qué es el What-if

Es una función de **"¿y si…?"**: permite explorar un **escenario alternativo** desde un punto
de la reproducción para compararlo con el actual sin perder el original. Ejemplo didáctico:
*"estoy viendo FCFS; ¿y si fuese SJF?"* o *"¿y si el quantum fuese 4 en lugar de 2?"*.
Se crea una **rama paralela** (`whatIfBranch`) con su propio resultado y `Player`, mientras la
simulación principal queda intacta.

## 2. Estado previo (el problema)

El componente `WhatIfControls` estaba **implementado, exportado y testeado**, pero en la práctica
**no se usaba**, por dos motivos:

1. **No estaba montado en ninguna parte.** `SimulationApp` no renderizaba `WhatIfControls`, y todas
   las páginas de `docs/` usan `SimulationApp`. El componente nunca llegaba a la pantalla.
2. **Era inerte aunque se montara.** Su único botón llamaba a `createWhatIf({})` con overrides
   vacíos, por lo que la rama clonaba el escenario **idéntico**: no había forma de introducir una
   variación, así que crear una rama no producía nada distinto de la simulación principal.

Además se detectó una **divergencia con la especificación**: `SPECv-02.md` describe el what-if como
una bifurcación desde el `SchedulerState` del tick `T` (vía `runFrom(state)`, conservando el
historial hasta `T`), mientras que la implementación de `createWhatIf` siempre rederiva el escenario
completo con `run()`.

## 3. Decisión de diseño

Hacer el what-if **funcional y visible sobre la API existente**, sin tocar el motor:

- **Comparador de escenario alternativo.** En un tick intermedio, `WhatIfControls` muestra un
  formulario con un selector de algoritmo (todos los registrados) y los campos de parámetros del
  algoritmo elegido. Al pulsar **"Comparar"** llama a `createWhatIf({ algorithm, params })`. Con
  rama activa, muestra una **tabla comparativa de métricas agregadas** (espera media, turnaround
  medio, utilización de CPU, throughput) del escenario actual frente a la rama, con su diferencia.
- **Sin refactor de `GanttChart`/`MetricsTable`.** La comparación vive dentro de `WhatIfControls`,
  que lee del contexto tanto `result.metrics` (actual) como `whatIfBranch.result.metrics` (rama). Se
  respeta la arquitectura de fuente única de verdad.
- **Divergencia con la spec asumida y documentada.** El what-if implementado compara un escenario
  alternativo rederivando completo; **no** bifurca desde el `SchedulerState` en `T`. El enfoque
  `runFrom(state)` queda como trabajo futuro. Se actualizó la spec para reflejar la realidad.

## 4. Cambios realizados

| Archivo | Cambio |
|---|---|
| `src/core/registry.ts` | Nueva función `list(): readonly string[]` (algoritmos registrados, en orden) |
| `src/react/WhatIfControls.tsx` | Rediseño: formulario de variación (algoritmo + parámetros) + tabla comparativa de métricas |
| `src/react/style/WhatIfControls.module.css` | Estilos del formulario y la tabla, usando `tokens.css` |
| `src/react/SimulationApp.tsx` | Monta `<WhatIfControls />` en un slot nuevo |
| `src/react/style/SimulationApp.module.css` | Área de rejilla `whatif` (entre `controls` y `metrics`) |
| `tests/core/registry.test.ts` | Tests de `list()` |
| `tests/react/WhatIfControls.test.tsx` | Tests reescritos para la nueva UI |
| `specs/TECHNICAL.md` | Contrato del componente `WhatIfControls` |
| `specs/v-02/BEHAVIOUSv-02.md` | § WhatIfControls reescrito al comportamiento real |
| `specs/DECISIONS.md` | ADR 29-06-2026 (decisión y divergencia) |
| `docs/src/content/docs/guide/02-configuracion-y-escenarios.mdx` | Sección "Análisis What-If" actualizada |

## 5. Verificación

- **Lint:** mis archivos limpios (0 errores/warnings).
- **Typecheck:** `tsc --noEmit` sin errores.
- **Tests propios:** `WhatIfControls.test.tsx`, `registry.test.ts`, `SimulationApp.test.tsx` → en verde.
- **Suite completa:** 279/282 (ver punto 6).
- **Build de docs:** `docs/` compila (14 páginas).

## 6. Incidencia pre-existente (no relacionada)

`tests/react/GanttChart.test.tsx` falla **3 de 18** (leyenda de E/S: "En E/S" / "Esperando E/S").
Se verificó que **falla igual en la base `dev-02` con mis cambios apartados** (`git stash`), de forma
determinista. Es por tanto un fallo previo del trabajo en curso de `dev-02`, **ajeno a esta
funcionalidad** (la aserción que falla fija `requires` directamente y no usa el `registry`). No se
corrige aquí por estar fuera del alcance.

## 7. Trabajo futuro

- What-if basado en `runFrom(SchedulerState en T)` (la visión original de `SPECv-02.md`).
- Comparación del **Gantt** de la rama (no solo métricas), que exigiría que `GanttChart` aceptara
  datos por props.
