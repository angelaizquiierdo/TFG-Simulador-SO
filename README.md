# Simuladores de algoritmo de sistemas operativo
[![Quality gate status](https://sonarcloud.io/api/project_badges/measure?project=angelaizquiierdo_TFG-Simulador-SO&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=angelaizquiierdo_TFG-Simulador-SO)

Simulador web interactivo de algoritmos de planificación de CPU, desarrollado como recurso didáctico de apoyo para la asignatura de Sistemas Operativos del Grado en Ingeniería Informática (Universidad de La Laguna). Permite visualizar, tick a tick, cómo decide cada algoritmo de planificación, comparar dos escenarios entre sí (*what-if*) y editar procesos y parámetros sin salir de la página.

Desarrollado siguiendo la metodología **Spec-Driven Development (SDD)**: toda decisión de arquitectura y comportamiento se especificó por escrito antes de implementarse, con un agente de IA (Claude Code) ejecutando el desarrollo bajo ese contrato. La especificación completa vive en los documentos de la raíz del repositorio (`SPECv-02.md`, `TECHNICAL.md`...) y el razonamiento detrás de cada decisión importante en [`DECISIONS.md`](./DECISIONS.md); este README resume el resultado, no lo sustituye.

## Índice

1. [Organización de la arquitectura](#1-organización-de-la-arquitectura)
2. [Metodología y especificación (SDD)](#2-metodología-y-especificación-sdd)
3. [Algoritmos soportados](#3-algoritmos-soportados)
4. [Núcleo — `src/core`](#4-núcleo--srccore)
5. [Componentes — `src/react`](#5-componentes--srcreact)
6. [Documentación — `docs/`](#6-documentación--docs)
7. [Decisiones de diseño relevantes](#7-decisiones-de-diseño-relevantes)
8. [Sistema de diseño y accesibilidad](#8-sistema-de-diseño-y-accesibilidad)
9. [Stack tecnológico](#9-stack-tecnológico)
10. [Instalación y desarrollo](#10-instalación-y-desarrollo)
11. [Estrategia de pruebas](#11-estrategia-de-pruebas)
12. [Integración continua](#12-integración-continua)
13. [Capturas](#13-capturas)
14. [Licencia](#14-licencia)

---

## 1. Organización de la arquitectura

Tres capas con una única dirección de dependencia: **`docs → react → core`**, impuesta no solo por convención sino por reglas de importación de ESLint (fronteras detalladas en `eslint.config.js`).

- **`src/core`** — toda la lógica de planificación. TypeScript puro, sin React ni DOM: usable desde cualquier interfaz o desde un script de Node.
- **`src/react`** — consume el núcleo y renderiza los resultados.
- **`docs/`** — subproyecto Astro + Starlight que embebe el componente como isla, con una página de demo por algoritmo y guías para desarrolladores.

Referencia completa: [`TECHNICAL.md`](./TECHNICAL.md).

## 2. Metodología y especificación (SDD)

El desarrollo se dividió en dos iteraciones (v-01, prueba de concepto; v-02, arquitectura definitiva), cada una con su propia especificación como archivo suelto en la raíz del repositorio:

| Documento | Contenido |
|---|---|
| [`SPECv-01.md`](./SPECv-01.md) / [`SPECv-02.md`](./SPECv-02.md) | Requisitos funcionales, alcance y límites operativos de cada versión |
| [`BEHAVIOURSv-01.md`](./BEHAVIOURSv-01.md) / [`BEHAVIOURSv-02.md`](./BEHAVIOURSv-02.md) | Criterios de aceptación (Dado/Cuando/Entonces) que cierran cada tarea, y que validan los tests |
| [`TECHNICAL.md`](./TECHNICAL.md) | Arquitectura, contratos de interfaz y normas estrictas de implementación (aplica a ambas versiones) |

El desglose en tareas atómicas que orquestó el desarrollo vive en [`PLAN.md`](./PLAN.md), y el protocolo que siguió el agente de IA para ejecutarlas en [`CLAUDE.md`](./CLAUDE.md).

## 3. Algoritmos soportados

**No expropiativos:** FCFS, SJF, LJF, Prioridad no expropiativa
**Expropiativos:** Round Robin, SRTF, Prioridad expropiativa, Round Robin Virtual (RRV), Cola Multinivel Realimentada (MLFQ)

## 4. Núcleo — `src/core`

Cada algoritmo implementa el contrato `IAlgorithm` (`src/core/types/algorithm.ts`):

- **`select()`** — obligatorio: decide qué proceso ocupa la CPU.
- **`quantumFor()`, `onEvent()`, `levelSnapshot()`** — opcionales, para algoritmos con estado interno (RRV, MLFQ).

El motor (`simulate.ts` + `engine/` + `derive/`) ejecuta la simulación tick a tick sin conocer la implementación concreta de cada algoritmo, y `io-subsystem.ts` modela el dispositivo de E/S como una pieza aislada, consultada solo por Round Robin Virtual. Detalle completo en `TECHNICAL.md` y en la memoria del proyecto (capítulo 4.2).

## 5. Componentes — `src/react`

`SimulationApp` orquesta siete componentes sobre un `SimulationProvider` común: `AlgorithmParamsForm`, `ProcessTable`, `ProcessForm`, `GanttChart`, `PlaybackControls`, `MetricsTable` y `WhatIfControls`. Cubren, entre otras cosas, la edición de procesos y parámetros, la comparación *what-if* entre dos algoritmos, y la persistencia del escenario en `sessionStorage`.

## 6. Documentación — `docs/`

Sitio Astro + Starlight con tres guías para desarrolladores (integración del componente, configuración de escenarios, creación de nuevos algoritmos) y una página de demo por algoritmo, cada una con un escenario elegido para mostrar el comportamiento distintivo de ese algoritmo.

## 7. Decisiones de diseño relevantes

Registradas como *Architectural Decision Records* en [`DECISIONS.md`](./DECISIONS.md). Algunas de las más relevantes:

- Migración de `preemptionMode` (enum) a `triggers` (conjunto de condiciones), al no escalar a algoritmos con expropiación por múltiples motivos.
- Modularización de `simulate.ts` en fachada + `engine/` + `derive/`.
- Introducción de `SimulationApp` para formalizar la composición de los siete componentes de `src/react` dentro de una única isla de Astro.

## 8. Sistema de diseño y accesibilidad

`tokens.css` centraliza la paleta y responde al interruptor de tema claro/oscuro que ya trae Starlight. Los controles de reproducción usan iconos SVG propios (`src/react/icons/`) marcados como decorativos (`aria-hidden`), con el nombre accesible en el botón contenedor (`aria-label` dinámico).

## 9. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Núcleo | TypeScript puro |
| Componentes | React 18 |
| Documentación | Astro + Starlight |
| Build | Vite (`vite-plugin-dts` para los tipos publicados) |
| Tests | Vitest + Testing Library |
| Análisis estático | ESLint (`typescript-eslint`) |
| CI | GitHub Actions + SonarCloud |

## 10. Instalación y desarrollo

```bash
npm install

npm run build           # compila el paquete publicable (dist/)
npm run typecheck       # tsc --noEmit
npm run lint            # eslint .
npm run test            # vitest run
npm run test:coverage   # vitest run --coverage

npm run docs:dev        # levanta el sitio de documentación en local
npm run docs:build      # build de docs/
npm run docs:preview    # previsualiza el build de docs/
```

## 11. Estrategia de pruebas

- **`src/core`** se prueba con Vitest en entorno Node, mediante pruebas basadas en valores esperados (*example-based testing*): cada algoritmo se ejecuta contra un escenario conocido y se compara el resultado con un Gantt y unas métricas calculadas a mano.
- **`src/react`** se prueba con Vitest en entorno jsdom y Testing Library. Los componentes se renderizan dentro del `SimulationCtx.Provider` real, con un valor de contexto construido a mano para cada caso; las funciones cuya llamada hay que verificar (por ejemplo `updateParams`) se sustituyen por `vi.fn()`, mientras que el resto del contexto usa funciones vacías. `run()` y `Player`, del núcleo, se ejecutan de forma real, no mockeada.
- Los dos entornos están separados (`tests/core`, `tests/react`) para que el núcleo nunca arrastre dependencias de interfaz.
- Umbral de cobertura exigido, igual para ambas carpetas: 90 % en líneas, funciones y sentencias, y 80 % en ramas.
- **Pendiente:** pruebas end-to-end sobre el sitio ya desplegado en Astro, que verificarían la integración real del componente en un navegador más allá de lo que cubren los tests unitarios y de componente actuales.

## 12. Integración continua

Cada `push` a `main` y cada Pull Request dispara un workflow de GitHub Actions que instala dependencias, ejecuta la suite de tests con cobertura (`npm run test -- --coverage`) y envía el reporte (`coverage/lcov.info`) a SonarCloud para su análisis estático y seguimiento de calidad.

## 13. Capturas


*(→ Gantt en ejecución, tema claro/oscuro)*

*(→ edición de procesos con ProcessForm)*

*(→ comparación what-if entre dos algoritmos)*

## 14. Licencia

Este proyecto está bajo licencia [Creative Commons Reconocimiento-NoComercial-CompartirIgual 4.0 Internacional](https://creativecommons.org/licenses/by-nc-sa/4.0/).
