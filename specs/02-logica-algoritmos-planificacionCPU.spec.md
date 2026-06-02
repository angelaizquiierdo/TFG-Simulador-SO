# Especificación: Motor Único de Planificación de CPU (Patrón Strategy)

## 1. Contexto y Objetivo
Implementar la lógica matemática de los 8 algoritmos clásicos de planificación de CPU
(FCFS, SJF, LJF, Prioridad No Expropiativa, SRTF, LRTF, Prioridad Expropiativa y Round Robin)
mediante el patrón **Strategy** sobre un motor de simulación compartido.

El motor recorre el tiempo tick a tick (`t = 0, 1, 2…`), gestiona la CPU, las colas y el
tiempo inactivo, y produce dos salidas: el `historial: EstadoPaso[]` (snapshot por instante,
para la interfaz y el diagrama de Gantt) y `resultados: ProcesoControlFinal[]` (métricas
finales por proceso). La lógica específica de cada algoritmo se inyecta como un objeto
`PoliticaPlanificacion`.

## 2. Dependencias y Contexto Existente 
El código a generar debe integrarse con la arquitectura actual del proyecto. **NO debes generar ni modificar** las interfaces base. 

Debes importar y utilizar estrictamente los tipos `Proceso`, `EstadoPaso` y `ProcesoControlFinal` que **ya existen** en el archivo:
- `src/types/proceso.ts`

Cualquier lógica matemática que escribas debe respetar la estructura exacta de esas interfaces existentes.


## 3. Alcance y Exclusiones
- **DENTRO de alcance (v1):** los 8 algoritmos de planificación de CPU sobre ráfaga continua.
- **FUERA de alcance (v1):** las operaciones de E/S (`tiempoLlegadaES`, `tiempoES`, estado
  `bloqueado`, `colaBloqueados`). En esta versión el motor **no bloquea** procesos: `colaBloqueados`
  se emite siempre como `[]` y ningún proceso entra en estado `bloqueado`. La E/S se especificará
  por separado (futuro `04-logica-es.spec.md`) para no arriesgar la estabilidad del núcleo de
  planificación. La interfaz `EstadoPaso` ya prevé estos campos, así que la extensión futura no
  romperá el contrato.

## 4. Decisión de Arquitectura
Toda decisión de planificación se reduce a dos preguntas **ortogonales** por tick:
1. **Selección** — si la CPU está libre, ¿a qué proceso de la `colaListos` se le asigna? → `comparar()`.
2. **Expropiación** — si la CPU está ocupada, ¿hay que expulsar al proceso actual ahora mismo? → `debeExpropiar()`.

Round Robin es un caso particular del eje 2: expropia cuando el proceso agota su `tiempoMaximoTurno`.

Se elige **Strategy con composición** (objetos de política inyectados) frente a Template Method
(herencia de clases) porque encaja con TypeScript puro + Vitest: cada política es un objeto puro
testeable de forma aislada, añadir un algoritmo es añadir un objeto y no se toca el motor.

## 5. Archivos a Generar
- `src/utils/algoritmos/motorPlanificacion.ts` — el **único** motor (bucle de tiempo y generación del historial).
- `src/utils/algoritmos/comparadores.ts` — funciones de comparación para el eje de selección.
- `src/utils/algoritmos/politicas.ts` — los 8 objetos `PoliticaPlanificacion` (ensamblan comparador + `debeExpropiar` + `config`).
- `src/utils/algoritmos/index.ts` — barril con funciones envolventes (`simularFCFS`, …, `simularRoundRobin`).
- `src/utils/algoritmos/__tests__/planificacion.test.ts` — pruebas unitarias (Vitest).

## 6. Modelos de Datos Nuevos (solo en `motorPlanificacion.ts`)
Estos tipos son auxiliares del motor; no pertenecen al contrato de `proceso.ts`.

```ts
export interface ContextoTick {
  tiempoActual: number;                       // t del tick en curso
  ticksEnCPU: number;                         // ticks consecutivos del proceso actual sin interrupción (para el quantum)
  procesoEnEjecucion: ProcesoControlFinal;    // el proceso que ocupa la CPU al evaluar la expropiación
}

export interface PoliticaPlanificacion {
  nombre: string;                             // p. ej. "SRTF"
  config: ConfiguracionSimulador;
  /** Eje 1 — Selección. Orden de la colaListos: el menor (índice 0) se ejecuta primero. */
  comparar(a: ProcesoControlFinal, b: ProcesoControlFinal): number;
  /** Eje 2 — Expropiación. ¿Hay que expulsar al proceso actual en este instante? */
  debeExpropiar(ctx: ContextoTick, colaListos: ProcesoControlFinal[]): boolean;
}
```

## 7. Lógica del Motor (`motorPlanificacion.ts`)
**Firma:**
```ts
export function simular(
  procesos: Proceso[],
  politica: PoliticaPlanificacion
): { historial: EstadoPaso[]; resultados: ProcesoControlFinal[] };
```

**Estado interno:**
- `controles: ProcesoControlFinal[]` — uno por proceso, vía `inicializarControlProceso`.
- `colaListos: ProcesoControlFinal[]` — cola de listos (se opera por referencia a los controles).
- `procesoActual: ProcesoControlFinal | null` — quién ocupa la CPU.
- `ticksEnCPU: number` — contador para el quantum.
- `t: number` — reloj, empieza en `0`.
- `historial: EstadoPaso[]`, `gantt: string[]` — acumuladores.

**Convención temporal:** el tick `t` representa el intervalo `[t, t+1)`. Lo que se decide en el
tick `t` es quién ocupa la CPU durante ese intervalo. Un proceso que agota su última unidad en el
tick `t` **finaliza en el instante `t + 1`** (`tiempoFin = t + 1`).

**Bucle (mientras exista algún control sin terminar):**

1. **Llegadas.** Para cada control con `tiempoLlegada === t` que no esté terminado, **anexar al final**
   de `colaListos` (en el orden del array de entrada, para respetar el desempate FIFO).
2. **Expropiación (eje 2).** Si `procesoActual !== null`:
   construir `ctx = { tiempoActual: t, ticksEnCPU, procesoEnEjecucion: procesoActual }`.
   Si `politica.debeExpropiar(ctx, colaListos)` es `true`:
   anexar `procesoActual` **al final** de `colaListos`, poner `procesoActual = null`, `ticksEnCPU = 0`.
   *(Las llegadas (paso 1) se encolan antes que el proceso expropiado: si en el mismo tick llega un
   proceso y otro agota su quantum, el recién llegado va delante en la cola — convención RR estándar.)*
3. **Selección (eje 1).** Si `procesoActual === null` y `colaListos.length > 0`:
   ordenar `colaListos` con `politica.comparar` (orden **estable**), extraer el índice `0`
   (`colaListos.shift()`), asignarlo a `procesoActual`, poner `ticksEnCPU = 0`.
4. **Ejecución.** Si `procesoActual !== null`: `procesoActual.tiempoRestante -= 1`; `ticksEnCPU += 1`;
   `gantt.push(procesoActual.id)`. Si `procesoActual === null`: `gantt.push("IDLE")`.
5. **Mensaje.** Determinar `mensaje` del tick con esta prioridad:
   terminación (`"P{id} finaliza en t={t+1}"`) > selección nueva en este tick (`"P{id} entra a ejecución"`)
   > expropiación en este tick (`"P{id} expropiado"`) > idle (`"CPU inactiva"`) > continuación (`"P{id} en ejecución"`).
6. **Snapshot.** Construir y anexar a `historial` el `EstadoPaso` del instante `t`:
   - `tiempoActual = t`
   - `procesoEnEjecucion = procesoActual?.id ?? null`
   - `colaListos = colaListos.map(p => p.id)` (orden actual)
   - `colaBloqueados = []` (E/S fuera de alcance)
   - `mensaje` = el del paso 5
   - `gantt = [...gantt]` (copia acumulada)
   - `estadosProcesos`: una entrada por control según §7.1.
   El snapshot se construye **antes** de la baja por terminación: un proceso que acaba su última
   unidad en el tick `t` aparece como `ejecutando` en ese tick (corrió durante `[t, t+1)`) y pasa a
   `terminado` a partir del tick `t+1`.
7. **Terminación.** Si `procesoActual !== null` y `procesoActual.tiempoRestante === 0`:
   `tiempoFin = t + 1`; `tiempoRetorno = tiempoFin - tiempoLlegada`; `tiempoEspera = tiempoRetorno - tiempoCPU`;
   `procesoActual = null`; `ticksEnCPU = 0`.
8. `t += 1`.

**Salvaguarda:** abortar con error si `t` supera `suma(tiempoCPU) + 10000` (evita bucles infinitos
ante entradas inválidas). Con datos válidos el bucle siempre termina.

### 7.1 Cálculo del estado por proceso en el snapshot
Para cada control `c`, su `EstadoProcesoEnTiempo`:
- `estado = 'not-arrived'` si `c.tiempoLlegada > t`.
- `estado = 'terminado'` si `c.tiempoFin !== undefined` y `t >= c.tiempoFin`.
- `estado = 'ejecutando'` si `c === procesoActual`.
- `estado = 'esperando'` si `c` está en `colaListos`.
- `tiempoEjecutado = c.tiempoCPU - c.tiempoRestante`.

*(El estado `'bloqueado'` no se usa en v1.)*

## 8. Comparadores de Selección (`comparadores.ts`)
Todos los comparadores aplican, tras su criterio principal, el **desempate determinista**:
primero menor `tiempoLlegada`, y si persiste, menor `id` alfabético. Esto garantiza simulaciones
reproducibles para los tests.

| Comparador | Criterio principal (índice 0 = se ejecuta primero) |
|---|---|
| `compararFCFS` | menor `tiempoLlegada` |
| `compararSJF` | menor `tiempoCPU` (ráfaga original) |
| `compararLJF` | mayor `tiempoCPU` |
| `compararPrioridad` | menor `prioridad` (0 = prioridad máxima; `undefined` se trata como `+Infinity`) |
| `compararSRTF` | menor `tiempoRestante` (valor vivo) |
| `compararLRTF` | mayor `tiempoRestante` |
| `compararFIFO` (RR) | `() => 0` — no reordena; preserva el orden de la cola (sort estable) |

Recomendado: un helper `conDesempate(criterioPrincipal)` que componga el criterio principal con
`tiempoLlegada` y luego `id`, para no repetir la cadena de desempate en cada comparador.

## 9. Políticas (`politicas.ts`) — mapeo de los 8 algoritmos
Cada política ensambla un comparador (eje 1) y una función `debeExpropiar` (eje 2). La expropiación
usa **desigualdad estricta** sobre el criterio principal para no provocar cambios de contexto en empates.

| Política | `comparar` | `debeExpropiar(ctx, cola)` | `config` |
|---|---|---|---|
| FCFS | `compararFCFS` | `false` | `{ expropiativo:false, usaPrioridades:false }` |
| SJF | `compararSJF` | `false` | `{ expropiativo:false, usaPrioridades:false }` |
| LJF | `compararLJF` | `false` | `{ expropiativo:false, usaPrioridades:false }` |
| Prioridad No Exp. | `compararPrioridad` | `false` | `{ expropiativo:false, usaPrioridades:true }` |
| SRTF | `compararSRTF` | `cola.some(q => q.tiempoRestante < ctx.procesoEnEjecucion.tiempoRestante)` | `{ expropiativo:true, usaPrioridades:false }` |
| LRTF | `compararLRTF` | `cola.some(q => q.tiempoRestante > ctx.procesoEnEjecucion.tiempoRestante)` | `{ expropiativo:true, usaPrioridades:false }` |
| Prioridad Exp. | `compararPrioridad` | `cola.some(q => prio(q) < prio(ctx.procesoEnEjecucion))` | `{ expropiativo:true, usaPrioridades:true }` |
| Round Robin | `compararFIFO` | `ctx.ticksEnCPU >= config.tiempoMaximoTurno` | `{ expropiativo:true, usaPrioridades:false, tiempoMaximoTurno: q }` |

donde `prio(p) = p.prioridad ?? Number.POSITIVE_INFINITY`.

Nótese que SJF y SRTF comparten concepto (ráfaga) y solo difieren en `debeExpropiar`; igual que
Prioridad No Exp. y Prioridad Exp. comparten `compararPrioridad`. Esa simetría es la prueba de que
la arquitectura captura la relación real entre algoritmos.

## 10. Funciones Envolventes (`index.ts`)
Patrón **barril**: oculta el motor y las políticas tras funciones limpias listas para la UI.
```ts
export const simularFCFS = (p: Proceso[]) => simular(p, politicaFCFS);
export const simularSJF  = (p: Proceso[]) => simular(p, politicaSJF);
export const simularLJF  = (p: Proceso[]) => simular(p, politicaLJF);
export const simularPrioridadNoExpropiativa = (p: Proceso[]) => simular(p, politicaPrioridadNoExp);
export const simularSRTF = (p: Proceso[]) => simular(p, politicaSRTF);
export const simularLRTF = (p: Proceso[]) => simular(p, politicaLRTF);
export const simularPrioridadExpropiativa   = (p: Proceso[]) => simular(p, politicaPrioridadExp);
export const simularRoundRobin = (p: Proceso[], quantum: number) =>
  simular(p, crearPoliticaRoundRobin(quantum));   // construye la política con tiempoMaximoTurno = quantum
```

## 11. Convenciones y Reglas (resumen normativo)
- Reloj inicia en `t = 0`. Idle se representa en `gantt` con el literal `"IDLE"`.
- Desempate global de selección: criterio principal → `tiempoLlegada` → `id`.
- Expropiación con desigualdad **estricta** (sin cambios de contexto en empates).
- En el mismo tick, el orden de encolado es: primero las llegadas, después el proceso expropiado.
- `tiempoFin = t + 1` al agotar la última unidad en el tick `t`.
- `tiempoRetorno = tiempoFin - tiempoLlegada`; `tiempoEspera = tiempoRetorno - tiempoCPU`.

## 12. Plan de Pruebas (TDD con Vitest)
Archivo `src/utils/algoritmos/__tests__/planificacion.test.ts`. Datos **estáticos** (sin `Math.random`).
Mínimo exigido: 2 edge cases compartidos + al menos 1 test por algoritmo + 1 de métricas + 1 de consistencia del historial.

**Edge cases compartidos:**
- Array vacío de procesos ⇒ `historial` y `resultados` vacíos, sin lanzar error.
- CPU inactiva: si el primer proceso llega en `t = 2`, los primeros dos elementos de `gantt` deben ser `"IDLE"`.

**Por algoritmo:**
- **FCFS:** 5 procesos con llegadas distintas ⇒ se ejecutan estrictamente por orden de llegada.
- **SJF:** proceso largo en `t=0` y cortos en `t=1` ⇒ el largo termina primero (no expropiativo); luego los cortos de menor a mayor ráfaga.
- **LJF:** al coincidir varios en cola, elige siempre el de mayor ráfaga.
- **Prioridad No Exp.:** elige el de menor `prioridad`; el seleccionado corre hasta terminar.
- **SRTF:** proceso largo en ejecución es **expropiado** al llegar uno más corto (verificar que `procesoEnEjecucion` cambia en el tick de la llegada).
- **LRTF:** análogo a SRTF pero a favor del de mayor `tiempoRestante`.
- **Prioridad Exp.:** llega un proceso de mayor prioridad (menor número) y expropia al actual.
- **Round Robin (`quantum=2`):** con dos procesos largos, la CPU alterna cada 2 ticks (patrón round-robin verificable en `gantt`).

**Métricas (caso de referencia, FCFS):** procesos `P1(0,5) P2(1,3) P3(2,8) P4(3,6)`:
- P1 → fin 5, retorno 5, espera 0
- P2 → fin 8, retorno 7, espera 4
- P3 → fin 16, retorno 14, espera 6
- P4 → fin 22, retorno 19, espera 13

**Consistencia del historial:** para cualquier simulación no vacía, `historial.length === gantt.length`,
y para cada paso `historial[i].gantt.length === i + 1` y `historial[i].procesoEnEjecucion` coincide con
`gantt[i]` (donde `"IDLE"` ↔ `null`).

**Determinismo de desempate:** dos procesos con idéntico criterio principal y misma `tiempoLlegada`
se ordenan por `id` alfabético.

## 13. Documentación Viva (actualizar `src/content/docs/modelos/referencia.md`)
Añadir una sección principal **"Arquitectura del Backend: Motor Único + Strategy"** que explique:
1. **Los dos ejes de decisión** (selección vs expropiación) y por qué un comparador solo no basta.
2. **`motorPlanificacion.ts`** como único bucle de tiempo y única fuente del `EstadoPaso[]` (evita duplicar historial).
3. **`comparadores.ts` y `politicas.ts`**: las estrategias inyectadas; resaltar la reutilización (SJF/SRTF, Prioridad N/Exp.).
4. **`index.ts` (barril / wrappers)**: "recepcionista" que oculta motor y políticas y expone `simularFCFS(...)`, etc., para que los componentes React consuman la lógica sin conocer el motor.
5. **Matriz de los 8 algoritmos** (reutilizar/enlazar la del `01-modelos-base.spec.md`) con su columna `comparar` y `debeExpropiar`.
6. **Cómo ejecutar las pruebas:** `npm run vitest` (modo watch), `npm run vitest --ui` (interfaz visual) y `npm run vitest run --coverage` (cobertura), con una breve descripción de cada uno.