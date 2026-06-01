---
title: "Referencia de Modelos de Datos Base"
description: "Documentación técnica de las interfaces y estructuras fundamentales del simulador de SO"
---

## Descripción General

Los modelos de datos base del simulador definen las estructuras que representan procesos, control de tiempos e historial de pasos del sistema operativo. Estos modelos son fundamentales para implementar algoritmos de planificación (FCFS, SJF, Round Robin, Prioridades) tanto expropiativos como no expropiativos.

## Diccionario de Propiedades

Guía completa de todas las propiedades utilizadas en las interfaces del simulador:

| Propiedad | Interfaz | Tipo | Requerido | Descripción |
|-----------|----------|------|-----------|-------------|
| `expropiativo` | ConfiguracionSimulador | `boolean` | ✓ | `true` si el algoritmo puede expulsar a un proceso de la CPU antes de que termine |
| `usaPrioridades` | ConfiguracionSimulador | `boolean` | ✓ | `true` si el algoritmo toma decisiones basadas en el campo prioridad |
| `tiempoMaximoTurno` | ConfiguracionSimulador | `number` | — | Límite máximo de ticks que un proceso puede usar la CPU de forma ininterrumpida (Quantum). Solo para algoritmos expropiativos por turno |
| `id` | Proceso | `string` | ✓ | Identificador único del proceso |
| `tiempoLlegada` | Proceso | `number` | ✓ | Instante en el que el proceso llega al sistema |
| `tiempoCPU` | Proceso | `number` | ✓ | Tiempo total de ejecución en CPU (burst time) |
| `tiempoLlegadaES` | Proceso | `number` | — | Instante en el que el proceso solicita una operación de E/S |
| `tiempoES` | Proceso | `number` | — | Duración de la operación de E/S |
| `prioridad` | Proceso | `number` | — | Prioridad del proceso (menor número = mayor prioridad) |
| `color` | Proceso | `string` | ✓ | Color hexadecimal para el diagrama de Gantt |
| `tiempoRestante` | ProcesoControlFinal | `number` | ✓ | Tiempo restante de ejecución (se decrementa en cada tick) |
| `tiempoFin` | ProcesoControlFinal | `number` | — | Momento exacto (tick) en el que terminó la ejecución |
| `tiempoRetorno` | ProcesoControlFinal | `number` | — | Tiempo de retorno = `tiempoFin - tiempoLlegada` |
| `tiempoEspera` | ProcesoControlFinal | `number` | — | Tiempo de espera = `tiempoRetorno - tiempoCPU` |
| `estado` | EstadoProcesoEnTiempo | `string` | ✓ | Estado actual: 'ejecutando' \| 'esperando' \| 'bloqueado' \| 'not-arrived' \| 'terminado' |
| `tiempoEjecutado` | EstadoProcesoEnTiempo | `number` | — | Tiempo acumulado que el proceso ha estado en ejecución |
| `tiempoActual` | EstadoPaso | `number` | ✓ | Tiempo actual de la simulación (tick) |
| `procesoEnEjecucion` | EstadoPaso | `string \| null` | ✓ | ID del proceso en ejecución (null si ninguno) |
| `estadosProcesos` | EstadoPaso | `EstadoProcesoEnTiempo[]` | ✓ | Estados de todos los procesos en este instante |
| `colaListos` | EstadoPaso | `string[]` | ✓ | IDs de procesos listos para ejecutar |
| `colaBloqueados` | EstadoPaso | `string[]` | — | IDs de procesos bloqueados en E/S |
| `mensaje` | EstadoPaso | `string` | ✓ | Mensaje descriptivo del evento ocurrido en este instante |
| `gantt` | EstadoPaso | `string[]` | ✓ | Historial acumulado de IDs de procesos ejecutados (para diagrama de Gantt) |

## Conceptos Clave: Algoritmos Expropiativos vs No Expropiativos

### Algoritmos No Expropiativos (Non-Preemptive)

Cuando `expropiativo: false`:

- **Característica**: Una vez que un proceso comienza la ejecución, no puede ser interrumpido hasta que termine su ejecución completa.
- **Cambios de Estado**: Los procesos transicionan de `'esperando'` → `'ejecutando'` → `'terminado'` sin interrupciones.
- **Campo `tiempoMaximoTurno`**: No es aplicable ni se utiliza.
- **Implicación**: La elección del siguiente proceso se hace solo cuando el actual termina o se bloquea.

### Algoritmos Expropiativos (Preemptive)

Cuando `expropiativo: true`:

- **Característica**: La CPU puede ser quitada a un proceso en ejecución por diversos motivos.
- **Cambios de Estado**: Los procesos pueden transicionar múltiples veces: `'esperando'` → `'ejecutando'` → `'esperando'` → `'ejecutando'` → `'terminado'`.
- **Dos subcategorías**:
  1. **Expropiativos por evento** (sin `tiempoMaximoTurno`): Se expulsa cuando llega un proceso de mayor prioridad o cuando termina una E/S.
  2. **Expropiativos por turno** (con `tiempoMaximoTurno`): Se expulsa cuando se agota el quantum de tiempo asignado.

## Arquitectura del Backend y Patrones de Diseño

### Visión General de la Estructura

El simulador implementa el **patrón Strategy** para permitir múltiples algoritmos de planificación sin duplicar código. La estructura se organiza en tres capas:

1. **Motor Central** (`motorNoExpropiativo.ts`): Lógica de simulación reutilizable
2. **Estrategias de Ordenación** (`estrategiasOrdenacion.ts`): Reglas específicas de cada algoritmo
3. **Funciones Wrapper** (`index.ts`): Interfaz pública simplificada

### 1. Patrón Strategy: El Motor y las Reglas

#### `src/utils/algoritmos/motorNoExpropiativo.ts`

**Responsabilidad**: Actúa como el motor central que maneja el bucle de simulación tiempo a tiempo (`t=0, 1, 2...`).

**Características clave**:
- Implementa el flujo general de la simulación no expropiativa
- Recibe una **función de ordenación inyectable** como parámetro
- Mantiene control de la CPU, estado de procesos y generación del historial paso a paso (`EstadoPaso`)
- **Evita duplicación de código**: Sin este motor, habría que copiar toda la lógica 4 veces (una por cada algoritmo)

**Firma**:
```typescript
function simularNoExpropiativo(
  procesos: Proceso[],
  ordenarColaListos: (a: ProcesoControlFinal, b: ProcesoControlFinal) => number
): { historial: EstadoPaso[]; resultados: ProcesoControlFinal[] }
```

**Flujo tick a tick**:
1. Identificar procesos listos (llegaron y no han terminado)
2. Aplicar función de ordenación inyectada
3. Si hay CPU libre, ejecutar el primero de la cola
4. Generar snapshot (`EstadoPaso`) del sistema en este instante
5. Si un proceso termina, calcular métricas y liberarlo
6. Repetir hasta que todos terminen

#### `src/utils/algoritmos/estrategiasOrdenacion.ts`

**Responsabilidad**: Contiene únicamente las funciones matemáticas de comparación para ordenar la `colaListos`.

**Implementa**:
```typescript
export const ordenarFCFS = (a: ProcesoControlFinal, b: ProcesoControlFinal) => number
export const ordenarSJF = (a: ProcesoControlFinal, b: ProcesoControlFinal) => number
export const ordenarLJF = (a: ProcesoControlFinal, b: ProcesoControlFinal) => number
export const ordenarPrioridad = (a: ProcesoControlFinal, b: ProcesoControlFinal) => number
```

**Cada función**:
- Define regla principal: FCFS por `tiempoLlegada`, SJF por `tiempoCPU`, etc.
- Incluye desempate secundario: `tiempoLlegada` (quien llegó antes, va primero)
- Retorna número negativo (a primero), positivo (b primero) o cero (igual)

**Ventaja**: Las estrategias son puras y aisladas. Cambiar la lógica de SJF no afecta a FCFS.

### 2. Patrón Barril / Funciones Envolventes (El Índice)

#### `src/utils/algoritmos/index.ts`

**Responsabilidad**: Actúa como un "recepcionista" que oculta la complejidad interna y exporta funciones públicas listas para usar.

**Propósito**:
- **Simplicidad para el consumidor**: Los componentes React solo ven `simularFCFS(procesos)`, no detalles internos
- **Flexibilidad**: Si la implementación interna cambia (ej. pasar de Strategy a otra cosa), el exterior no se ve afectado
- **Reutilización**: Evita código repetido inyectando estrategias distintas en el motor

**Funciones públicas**:
```typescript
export function simularFCFS(procesos: Proceso[]): ResultadoSimulacion
export function simularSJF(procesos: Proceso[]): ResultadoSimulacion
export function simularLJF(procesos: Proceso[]): ResultadoSimulacion
export function simularPrioridad(procesos: Proceso[]): ResultadoSimulacion
```

Cada función es un wrapper que simplemente llama:
```typescript
return simularNoExpropiativo(procesos, ordenarFCFS);
// return simularNoExpropiativo(procesos, ordenarSJF);
// etc.
```

**Cómo lo consume React**:
```typescript
// SimuladorBase.tsx (ejemplo)
import { simularFCFS } from '@/utils/algoritmos';

const resultado = simularFCFS(procesosDelUsuario);
mostrarHistorial(resultado.historial);
mostrarResultados(resultado.resultados);
```

El componente React nunca necesita saber cómo funciona el motor ni las estrategias.

### Ventajas de Esta Arquitectura

| Aspecto | Ventaja |
|--------|---------|
| **Reutilización** | Un motor para 4 algoritmos (+ futuros) |
| **Mantenimiento** | Cambios al motor benefician todos los algoritmos |
| **Testabilidad** | Motor, estrategias y wrappers se pueden probar independientemente |
| **Extensibilidad** | Agregar nuevo algoritmo = crear nueva estrategia de ordenación |
| **Claridad** | Cada archivo tiene una responsabilidad clara |

### Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│  React Component (SimuladorBase)                            │
│  "Necesito simular FCFS"                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  index.ts (Wrapper)                                         │
│  simularFCFS(procesos) → simularNoExpropiativo(...)         │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────────────┐  ┌──────────────────────┐
│ motorNoExpropiativo  │  │ estrategiasOrdenacion│
│                      │  │                      │
│ - Bucle t=0..tMax    │  │ - ordenarFCFS()      │
│ - CPU idle/busy      │  │ - ordenarSJF()       │
│ - Generar EstadoPaso │  │ - ordenarLJF()       │
│ - Calcular métricas  │  │ - ordenarPrioridad() │
└──────────────────────┘  └──────────────────────┘
        │                         ▲
        │     inyecta estrategia  │
        └─────────────────────────┘

        ▼
┌──────────────────────────────────────┐
│  Retorna:                            │
│  - historial: EstadoPaso[]           │
│  - resultados: ProcesoControlFinal[] │
└──────────────────────────────────────┘
```



### No Expropiativos (`expropiativo: false`, sin `tiempoMaximoTurno`)

| Algoritmo | usaPrioridades | Descripción | Configuración |
|-----------|-----------------|-------------|----------------|
| **FCFS** (First-Come, First-Served) | `false` | Procesos se ejecutan en orden de llegada. El más simple. | `{ expropiativo: false, usaPrioridades: false }` |
| **SJF** (Shortest Job First) | `false` | Se ejecuta primero el proceso con menor `tiempoCPU`. | `{ expropiativo: false, usaPrioridades: false }` |
| **LJF** (Longest Job First) | `false` | Se ejecuta primero el proceso con mayor `tiempoCPU`. | `{ expropiativo: false, usaPrioridades: false }` |
| **Prioridad No Expropiativa** | `true` | Se ejecuta el proceso con mayor prioridad. Los empates se resuelven por FCFS. | `{ expropiativo: false, usaPrioridades: true }` |

**Características Comunes:**
- El planificador toma decisiones solo cuando el proceso actual termina o solicita E/S
- Mayor predictibilidad de tiempos
- Posible inanición para procesos de baja prioridad

### Expropiativos por Evento (`expropiativo: true`, sin `tiempoMaximoTurno`)

| Algoritmo | usaPrioridades | Descripción | Configuración |
|-----------|-----------------|-------------|----------------|
| **SRTF** (Shortest Remaining Time First) | `false` | Versión expropiativa de SJF. Se ejecuta el proceso con menor `tiempoRestante`. | `{ expropiativo: true, usaPrioridades: false }` |
| **LRTF** (Longest Remaining Time First) | `false` | Versión expropiativa de LJF. Se ejecuta el proceso con mayor `tiempoRestante`. | `{ expropiativo: true, usaPrioridades: false }` |
| **Prioridad Expropiativa** | `true` | Se ejecuta el proceso con mayor prioridad. Si llega uno más prioritario, expulsa al actual. | `{ expropiativo: true, usaPrioridades: true }` |

**Características Comunes:**
- El planificador revisa en cada tick si debe cambiar de proceso
- Se expulsa cuando llega un proceso más prioritario o con menor tiempo restante
- Mejor tiempo de respuesta promedio
- Mayor complejidad de implementación

### Expropiativos por Turno (`expropiativo: true`, con `tiempoMaximoTurno`)

| Algoritmo | tiempoMaximoTurno | Descripción | Configuración |
|-----------|------|-------------|----------------|
| **Round Robin (RR)** | ✓ Definido | Todos los procesos reciben la misma cantidad de tiempo de CPU (quantum). Después se van a la cola del final. | `{ expropiativo: true, usaPrioridades: false, tiempoMaximoTurno: 4 }` |

**Características:**
- Equidad garantizada: todos los procesos obtienen CPU cada cierto tiempo
- Impide la inanición
- El quantum influye en el rendimiento: demasiado bajo → muchos cambios de contexto; demasiado alto → behaves like FCFS
- Excelente para sistemas interactivos

## Ejemplos Prácticos: Instanciación de Configuraciones

### Ejemplo 1: FCFS (First-Come, First-Served)

```typescript
import { crearProceso, crearPasoInicial } from '@/utils/procesoUtils';
import type { ConfiguracionSimulador, Proceso } from '@/types/proceso';

// Configuración del algoritmo
const configFCFS: ConfiguracionSimulador = {
  expropiativo: false,
  usaPrioridades: false,
};

// Creación de procesos
const procesos: Proceso[] = [
  crearProceso({
    id: 'P1',
    tiempoLlegada: 0,
    tiempoCPU: 8,
    color: '#FF6B6B',
  }),
  crearProceso({
    id: 'P2',
    tiempoLlegada: 1,
    tiempoCPU: 4,
    color: '#4ECDC4',
  }),
  crearProceso({
    id: 'P3',
    tiempoLlegada: 2,
    tiempoCPU: 2,
    color: '#45B7D1',
  }),
];

// Inicialización de la simulación
const pasoInicial = crearPasoInicial(procesos);
console.log(pasoInicial);
// Resultado: P1 entra a ejecución, P2 y P3 en not-arrived
```

### Ejemplo 2: Round Robin con quantum = 4

```typescript
import { crearProceso, crearPasoInicial } from '@/utils/procesoUtils';
import type { ConfiguracionSimulador, Proceso } from '@/types/proceso';

// Configuración Round Robin
const configRoundRobin: ConfiguracionSimulador = {
  expropiativo: true,
  usaPrioridades: false,
  tiempoMaximoTurno: 4, // Quantum de 4 ticks
};

// Mismos procesos
const procesos: Proceso[] = [
  crearProceso({
    id: 'P1',
    tiempoLlegada: 0,
    tiempoCPU: 8,
    color: '#FF6B6B',
  }),
  crearProceso({
    id: 'P2',
    tiempoLlegada: 1,
    tiempoCPU: 4,
    color: '#4ECDC4',
  }),
  crearProceso({
    id: 'P3',
    tiempoLlegada: 2,
    tiempoCPU: 2,
    color: '#45B7D1',
  }),
];

// En Round Robin con quantum=4:
// t=0-3: P1 ejecuta (4 ticks), va a cola final
// t=4-7: P2 ejecuta (4 ticks), termina
// t=8-9: P1 ejecuta (2 ticks restantes), termina
// t=10-11: P3 ejecuta (2 ticks), termina
```

### Ejemplo 3: Prioridad Expropiativa

```typescript
import type { ConfiguracionSimulador, Proceso } from '@/types/proceso';

// Configuración Prioridad Expropiativa
const configPrioridadExpropiativa: ConfiguracionSimulador = {
  expropiativo: true,
  usaPrioridades: true,
  // Sin tiempoMaximoTurno
};

// Procesos con prioridades (menor número = mayor prioridad)
const procesos: Proceso[] = [
  {
    id: 'P1',
    tiempoLlegada: 0,
    tiempoCPU: 10,
    prioridad: 3, // Baja prioridad
    color: '#FF6B6B',
  },
  {
    id: 'P2',
    tiempoLlegada: 2,
    tiempoCPU: 5,
    prioridad: 1, // Alta prioridad
    color: '#4ECDC4',
  },
];

// En Prioridad Expropiativa:
// t=0-1: P1 ejecuta (lleva 1 tick)
// t=2: Llega P2 (prioridad 1 > prioridad de P1 que es 3)
//      → P1 es expulsado a la cola
//      → P2 comienza a ejecutar
// Una vez que P2 termina, P1 continúa desde su tick 2
```

## Funciones Utilitarias

### crearProceso(datos: Partial<Proceso>, procesosExistentes: Proceso[]): Proceso

Crea y valida un proceso. Asigna color por defecto si no se proporciona. Valida que el ID no sea duplicado.

**Parámetros:**
- `datos`: Objeto con los datos del nuevo proceso
- `procesosExistentes`: Array de procesos ya creados para validar IDs duplicados

**Validación:**
- Lanza error si `tiempoLlegada` es negativo
- Lanza error si `tiempoCPU` es negativo
- Lanza error si el `id` ya existe en `procesosExistentes`
- Valida que `id`, `tiempoLlegada` y `tiempoCPU` sean proporcionados

**Comportamiento:**
- Si `color` no se proporciona, asigna uno de una paleta predefinida

**Ejemplo:**
```typescript
const p1 = crearProceso({
  id: 'P1',
  tiempoLlegada: 0,
  tiempoCPU: 5,
  color: '#FF6B6B'
}, []);

// Esto lanzará error: ID duplicado
const p1Duplicado = crearProceso({
  id: 'P1',
  tiempoLlegada: 2,
  tiempoCPU: 3,
  color: '#4ECDC4'
}, [p1]);
```

### inicializarControlProceso(p: Proceso): ProcesoControlFinal

Inicializa un `ProcesoControlFinal` a partir de un `Proceso`.

**Inicialización:**
- `tiempoRestante` ← `tiempoCPU`
- `tiempoFin` ← `undefined`
- `tiempoRetorno` ← `undefined`
- `tiempoEspera` ← `undefined`

### crearPasoInicial(procesos: Proceso[]): EstadoPaso

Crea el `EstadoPaso` inicial en `tiempoActual = 0`.

**Lógica:**
- `procesoEnEjecucion` ← `null`
- `colaListos` ← Solo procesos con `tiempoLlegada === 0`
- `gantt` ← `[]` (vacío)
- `estadosProcesos`: Asigna estado `'not-arrived'` a procesos con `tiempoLlegada > 0`, y `'esperando'` a los que llegan en t=0

## Pruebas Unitarias

Se proporciona un conjunto de 13+ pruebas unitarias (`vitest`) que validan:

1. **Proceso (crearProceso) - 5 pruebas**:
   - Creación válida con campos obligatorios
   - Asignación de color por defecto
   - Validación de tiempos negativos
   - Aceptación de campos opcionales (prioridad, E/S)
   - Validación de ID duplicado

2. **ProcesoControlFinal (inicializarControlProceso) - 4 pruebas**:
   - Inicialización de `tiempoRestante` igual a `tiempoCPU`
   - Campos de tiempo (`tiempoFin`, `tiempoRetorno`, `tiempoEspera`) inicializados como `undefined`
   - Herencia correcta de propiedades (`id`, `color`)
   - Mutabilidad de `tiempoRestante` sin afectar `tiempoCPU` original

3. **EstadoPaso (crearPasoInicial) - 4 pruebas**:
   - Estado inicial en `tiempoActual = 0` con `procesoEnEjecucion = null`
   - Asignación de estado `'not-arrived'` a procesos llegados después de t=0
   - Inicialización de `gantt` como array vacío
   - Construcción correcta de `colaListos` con solo procesos de `tiempoLlegada === 0`

### Ejecución de Pruebas

Las pruebas se pueden ejecutar de **dos formas**:

#### **Forma 1: Usando scripts de npm (recomendado)**

Desde el `package.json`:

```bash
# Ejecutar todas las pruebas (modo normal)
npm run test

# Equivalente a:
npm test

# Ejecutar pruebas con interfaz visual interactiva
npm run test:ui

# Ver cobertura de código
npm run coverage
```

#### **Forma 2: Usando vitest directamente**

Si tienes vitest instalado globalmente:

```bash
# Ejecutar todas las pruebas
vitest

# Ejecutar pruebas con interfaz visual
vitest --ui

# Ejecutar pruebas y generar reporte de cobertura
vitest run --coverage
```

### Descripción de Comandos

| Comando | Alias | Descripción | Función |
|---------|-------|-------------|---------|
| `npm run test` | `npm test` | Ejecuta todas las pruebas en modo watch | Valida que el código pase todas las pruebas unitarias |
| `npm run test:ui` | — | Abre interfaz visual en navegador | Interfaz interactiva para ver resultados de pruebas en tiempo real |
| `npm run coverage` | — | Genera reporte de cobertura | Muestra qué porcentaje del código está cubierto por pruebas |

### Interpretación de Resultados

**Pruebas exitosas:**
```
✓ Debe crear un proceso válido con los campos obligatorios
✓ Debe asignar un color por defecto si no se proporciona
✓ Debe lanzar error si tiempoCPU es negativo
...
```

**Cobertura de código (coverage):**
```
Statements   : XX.XX%
Branches     : XX.XX%
Functions    : XX.XX%
Lines        : XX.XX%
```

Idealmente, buscar una cobertura mayor al 80% para garantizar que la mayoría del código está siendo probado.
