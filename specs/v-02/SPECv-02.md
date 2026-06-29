# CPUSchedulerSimulator — Functional Spec (v2)

> Este documento es el **spec funcional completo**: parte de v01 e integra las mejoras de v2.
>
> **Resumen de mejoras v2:** > - Dos algoritmos nuevos: **Round Robin Virtual** (modela E/S) y **Cola de realimentación * > MLFQ** (solo CPU; cada nivel es una cola Round Robin con su propio quantum). Como > consecuencia de VRR, **ráfagas de E/S y estado de bloqueo** en el modelo (con su cola de > E/S).
> - **Envejecimiento / *priority boost*** en MLFQ (`boostInterval`), **configurable desde la > demo** junto con `quanta`.
> - **Edición de la entrada:** la configuración deja de ser fija. Se pueden **editar procesos**, hacer **escenarios *what-if*** (editar un estado pasado y rederivar otro futuro) e **inyectar procesos en vivo**.
> - **Persistencia** del escenario entre sesiones (solo `localStorage`, sin servidor).
> - **Estética afinada** de los componentes (tokens de diseño definidos).
>
> **Fuera de alcance v2:** multiprocesador/varios núcleos; backend, nube, colaboración > multiusuario y exportación (SVG/PNG/CSV/JSON); y E/S como recurso con contención. La > planificación sigue siendo monoprocesador y todo ocurre en el navegador.

## Objetivo 
Construir un componente web que simula un planificador de CPU monoprocesador que ejecute los algoritmos de planificación clásicos sobre un conjunto de procesos definido por el usuario, calcule la línea temporal completa de forma determinista y permita reproducirla visualmente hacia delante y hacia atrás, mostrando el estado del planificador en cada instante y las métricas resultantes por proceso y agregadas.

Se centra en el componente: se configura con un algoritmo y una configuración del problema. El núcleo de simulación **se ejecuta por completo en el navegador** de forma determinista y sin necesidad de conexión. Las páginas del sitio (una por algoritmo) son demos de cómo funciona el componente.

El simulador es una herramienta didáctica: su valor está en *ver y entender* cómo cada algoritmo toma decisiones, no en ejecutar cargas reales.

---

## Usuarios y contexto 
- **Usuario principal:** estudiantes y docentes de la asignatura de Sistemas Operativos que quieren visualizar y comparar el comportamiento de los algoritmos de planificación.
- **Contexto de uso:** es un componente que se puede añadir a cualquier página web, indicándole el algoritmo y la configuración del problema. Se ejecuta por completo en el navegador y renderiza tanto la simulación como la interfaz de navegación temporal. Está pensado para ser escalable (añadir nuevos algoritmos sin modificar el componente).

---

## Funcionalidades 
### Configuración del componente (entrada)

- **El componente recibe como configuración:** un conjunto de procesos, el algoritmo (indicado por un identificador o nombre) y los parámetros del algoritmo (p. ej. `quantum` en Round Robin y Round Robin Virtual: entero > 0; `quanta` en MLFQ: lista de enteros > 0, uno por nivel, y `boostInterval` opcional).
- **`quantum`, `quanta` y `boostInterval` son configurables desde la demo** (control `AlgorithmParamsForm`, con botón **"Aplicar"**: el cambio no rederiva hasta confirmarlo).
- Cada proceso tiene: identificador (p. ej. `P1`), tiempo de llegada (entero ≥ 0, obligatorio), ráfaga de CPU (entero > 0, obligatorio) y prioridad (entero > 0, opcional; solo en algoritmos de prioridad; convención: menor número = mayor prioridad).

- **E/S del proceso (solo en algoritmos que modelan E/S):** un proceso puede declarar una o más **operaciones de E/S**, cada una con **entrada de E/S** (`io_entry`: CPU ejecutada antes de bloquearse), **tiempo de E/S** (`io_time`: duración del servicio) y **salida de E/S** (`io_exit`: instante de retorno a la cola de listos; **derivado**, no se introduce). Si no se declara E/S, el proceso es solo CPU. Los algoritmos clásicos **ignoran** estos campos. Detalle en *Modelo de datos*.

- **Dispositivos de E/S:** la configuración puede declarar los **dispositivos** de E/S (por defecto, **uno**). Cada dispositivo sirve a un proceso a la vez y tiene una cola FCFS; los procesos **compiten** por él (ver *Simulación*). Cada ráfaga de E/S se dirige a un dispositivo (al único por defecto, o a uno indicado si hay varios).

- **Entrada editable:** la configuración **deja de ser fija**. Desde la interfaz se pueden **añadir, modificar y eliminar procesos** y cambiar el algoritmo y sus parámetros; al hacerlo, el escenario se vuelve a simular (rederivación, ver *Simulación*). Casos especiales: **escenarios *what-if*** (editar el estado en un tick pasado y rederivar un futuro distinto a partir de ahí) e **inyección de procesos en vivo** (añadir un proceso con llegada en el tick actual o futuro durante la reproducción). Los algoritmos que tiene dispositivos E/S puede **añadir, modificar y eliminar** los dispositivos.

### Componentes visuales 
El módulo expone **componentes visuales independientes**. Cada uno muestra un aspecto del resultado de la simulación:

- **Tabla de procesos (`ProcessTable`)** — muestra los procesos de entrada con sus campos. Cuando el algoritmo **modela E/S** (`requires.io`), muestra además las columnas de E/S (entrada, tiempo y salida derivada). En los algoritmos clásicos no aparecen.
- **Diagrama de Gantt (`GanttChart`)** — renderiza la línea temporal mediante una **matriz** (filas: procesos, columnas: ticks) según el historial. Como el historial está **precalculado** (se conoce el número total de ticks), la **tabla aparece desde el principio con su tamaño correcto** (todas las filas y columnas); **no cambia de tamaño al reproducir**. Cada celda indica el estado del proceso en ese tick (en CPU, en espera, en E/S, no llegado, completado). **Al avanzar/retroceder solo cambia el color de las celdas:** las celdas hasta el tick actual están coloreadas y las posteriores quedan vacías (sin revelar el futuro). El diagrama está sincronizado con los controles de reproducción.
- **Controles del simulador (`PlaybackControls`)** — reproducir/pausar, paso a paso, barra de desplazamiento.
- **Tabla de métricas (`MetricsTable`)** — métricas por proceso y agregadas.
- **Formulario de procesos (`ProcessForm`)** — añade, edita y elimina procesos (incluidas sus ráfagas de E/S) y **no se dispara la rederivación hasta pulsar "Simular"**. Es el componente de **edición** e **inyección en vivo**.
- **Formulario de parámetros del algoritmo (`AlgorithmParamsForm`)** — control para los parámetros configurables desde la demo: `quantum` (Round Robin y Round Robin Virtual) y `quanta` + `boostInterval` (MLFQ). El valor se edita libremente en el control, pero **no se aplica hasta pulsar "Aplicar"**: solo entonces se valida y se rederiva. Mientras el valor editado no coincide con el aplicado, se señala visualmente como **pendiente de aplicar** (no se simula con el valor a medio escribir). Si el algoritmo seleccionado no tiene parámetros configurables desde la demo, el componente no muestra nada.

Todos los componentes se conectan a través de un **contexto de simulación** (uno por simulación, para no mezclar datos). El proveedor (`SimulationProvider`) ejecuta la simulación y la comparte. Los componentes de visualización solo **leen** del contexto; los de edición (`ProcessForm`, `AlgorithmParamsForm`) pueden **modificar el escenario**, lo que provoca una **rederivación** determinista y la actualización del contexto.

Los cuatro componentes dentro del mismo proveedor forman un panel de simulador completo. Esto permite **dos layouts** según el uso:

1. **Todo junto** — los cuatro componentes dentro del mismo proveedor, como un panel de simulador completo. Se pueden organizar en tabs (tabla de procesos / Gantt+controles * métricas) o mostrar todos al mismo tiempo.
2. **Separados en documentación** — los componentes se colocan intercalados con texto explicativo: primero la tabla de procesos, luego un párrafo, luego el Gantt con controles, luego más texto y finalmente las métricas. Ideal para apuntes y material didáctico.

En ambos casos los componentes comparten el mismo contexto; la diferencia es solo dónde se colocan en el DOM.

### Arquitectura modular y extensible (patrón estrategia)

- **Desacoplamiento por interfaz:** el simulador ofrece una interfaz clara y abstracta (`IAlgorithm`) que actúa como contrato estricto para cualquier política de planificación de CPU.
- **Encapsulamiento en clases independientes:** cada algoritmo se implementa en su propia clase aislada. Queda prohibido mezclar la lógica interna del algoritmo con la lógica de control, tiempo o renderizado del simulador.
- **Selección por identificador:** el motor interactúa con los algoritmos de forma genérica a través de la interfaz, seleccionando la estrategia activa mediante un identificador único (un string o el nombre de la clase) gestionado por la interfaz de usuario.
- **Algoritmos con estado interno:** la interfaz admite algoritmos que mantienen sus propias colas internas (p. ej. la cola auxiliar de VRR o los niveles de MLFQ) sin acceder a los internos del motor. El motor sigue siendo el único dueño de la mecánica (tiempo, cola de E/S, historial, métricas, reproducción); el algoritmo solo aporta la política de selección y su propia estructura.

### Algoritmo (una página por algoritmo)

El algoritmo se indica al componente mediante un identificador (o el nombre de la clase que lo implementa) y el simulador lo usa para simular.

**Extensibilidad:** el simulador expone una interfaz para implementar nuevos algoritmos; basta implementar esa interfaz y registrar el algoritmo bajo un nombre. Algoritmos incluidos:

- No expropiativos (**solo CPU**, sin E/S):
 - FCFS (First-Come, First-Served)
 - SJF (Shortest Job First)
 - LJF (Longest Job First)
 - Prioridad (no expropiativa)
- Expropiativos:
 - Round Robin (con quantum configurable) — **solo CPU**, sin E/S
 - SRTF (Shortest Remaining Time First) — **solo CPU**, sin E/S
 - Prioridad (expropiativa) — **solo CPU**, sin E/S
 - **Round Robin Virtual** (con quantum configurable) — **modela E/S**: los procesos se bloquean, hay cola de E/S y favorece a los procesos intensivos en E/S.
 - **Cola de realimentación — MLFQ** (**3 niveles fijos**: nivel 0 y 1 son Round Robin con quantum editable; nivel 2 es FCFS **run-to-completion**) — **solo CPU**, sin E/S. **Solo expropia por agotamiento de quantum, nunca por llegada:** un proceso en CPU corre su quantum completo aunque lleguen otros (que esperan en el nivel 0); al agotarlo se degrada y se elige el siguiente del nivel no vacío de menor índice. Degradación por quantum y envejecimiento por *priority boost*.

**Modelo de E/S por algoritmo.** El **único** algoritmo que modela E/S (`requires.io = true`) es **Round Robin Virtual**: tiene cola de E/S, estado de bloqueo y dispositivos. **Todos los demás (incluido MLFQ) son estrictamente de CPU:** su estado por tick no tiene cola de E/S ni bloqueados, e **ignoran** los campos de E/S de los procesos. La interfaz solo muestra y valida los campos de E/S cuando el algoritmo seleccionado los modela (es decir, solo en Round Robin Virtual).

Cada algoritmo declara qué campos de proceso requiere (p. ej. prioridad; E/S) y qué parámetros necesita (p. ej. quantum en RR/VRR; `quanta` —dos enteros, uno por nivel Round Robin— y `boostInterval` en MLFQ, ambos configurables desde la demo).
El componente usa esa declaración para validar la configuración y mostrar la información pertinente.



### Simulación 
A partir de la entrada y el algoritmo, el simulador calcula de una sola vez la línea temporal completa del **escenario actual**. Su salida son datos, no elementos visuales:

- **Intervalos de la línea temporal** (qué proceso ocupa la CPU en cada intervalo, incluyendo huecos de inactividad), que el componente renderiza como diagrama de Gantt.
- **Historial de estados tick a tick**, que alimenta la reproducción e incluye un mensaje por evento (qué proceso entra en CPU, cuál finaliza, cuál entra en la cola de listos y cuál inicia/termina E/S).
- Las métricas por proceso y agregadas.

El tiempo es discreto y entero (ticks ≥ 0); existe una única CPU. El diagrama de Gantt es render del componente a partir de esos datos; el simulador solo produce los datos.

**Estado de E/S, dispositivos y contención (solo en algoritmos con `requires.io`).** En los algoritmos clásicos no hay E/S y la simulación es la de v01. En los que la modelan, la E/S es un **recurso finito**: hay uno o varios **dispositivos**; cada dispositivo sirve a **un proceso a la vez** y mantiene una **cola FCFS**. Cuando el proceso en CPU alcanza un `io_entry` declarado, solicita su dispositivo destino:
- si el dispositivo está **libre**, empieza el servicio de inmediato (estado **en E/S * servicio**) durante `io_time` ticks; - si está **ocupado**, el proceso entra en la **cola del dispositivo** (estado **esperando E/S**) y no consume tiempo de servicio hasta que el dispositivo lo admite (FCFS).
Al terminar el servicio, el dispositivo queda libre, admite a la cabeza de su cola y el proceso servido vuelve a la **cola de listos** de la CPU (su `io_exit`). Todo esto lo gestiona el **motor**; el algoritmo de CPU solo decide a quién dar la CPU, no toca los dispositivos.

**Rederivación (what-if e inyección en vivo).** Editar el escenario produce un resultado nuevo, también calculado en una sola pasada:
- **Edición de la entrada:** cambiar procesos/algoritmo/parámetros vuelve a simular desde el tick 0.
- **What-if:** se toma el **estado del planificador en el tick `T`** (ráfagas restantes, colas, bloqueados) como **condición inicial de una rama nueva**; el historial hasta `T` se conserva y se rederiva el futuro a partir de `T`. La rama es un escenario en sí mismo y es determinista.
- **Inyección en vivo:** añadir un proceso con `arrival_time ≥ tick actual` y rederivar hacia delante desde ese tick.
El determinismo se mantiene **por escenario/rama resuelto**: misma entrada (o mismo estado de partida) + mismo algoritmo ⇒ mismo resultado.

**Comparación what-if (vista en la demo).** Cuando hay una rama *what-if* activa, la interfaz muestra una **comparación lado a lado** del escenario actual frente a la rama, organizada en **tres secciones desplegables**:
- **Diagrama de Gantt — comparación:** los dos diagramas (actual y «¿y si?») completos, uno sobre otro, para ver cómo cambia la planificación.
- **Métricas por proceso — comparación:** por cada proceso, su tiempo de espera y de retorno en el escenario actual, en la rama y la diferencia.
- **Métricas agregadas — comparación:** espera media, turnaround medio, utilización de CPU y throughput, con su diferencia.
> **Nota de implementación (v-02):** la rama *what-if* actual se obtiene **rederivando el escenario completo** con el algoritmo/parámetros alternativos (`run()` con *overrides*), no bifurcando desde el `SchedulerState` del tick `T` como describe el párrafo anterior. La bifurcación por estado (`runFrom`) queda como evolución futura; ver `DECISIONS.md`.

### Navegación temporal y reproducción 
En cada instante se visualiza el estado del algoritmo: proceso en CPU, cola de listos, procesos **en E/S (en servicio)** y procesos **esperando dispositivo de E/S**, procesos aún no llegados y procesos completados. La navegación recorre el resultado **de la rama actual** ya calculado; moverse por la línea temporal no recalcula nada. Solo las acciones de edición (*what-if*, inyección) rederivan, y lo hacen creando/actualizando la rama, no al navegar.

- **Automática:** reproducir/pausar, hacia delante y hacia atrás, con velocidad ajustable.
- **Manual:** avanzar y retroceder un tick mediante botones, y saltar directamente a un tick concreto (barra de desplazamiento).

### Métricas 
- **Por proceso:** tiempo de finalización (`completion`), tiempo de retorno (`turnaround`), tiempo de espera (`waiting`) y tiempo de respuesta (`response`).
 - `waiting` = `turnaround − CPU_total − bloqueado_total`, donde `bloqueado_total` es el tiempo que el proceso pasa en el subsistema de E/S (**esperando dispositivo + en servicio**). Así `waiting` cuenta solo el tiempo en la cola de listos de la CPU. Para procesos sin E/S coincide con la definición de v01; con contención, la espera de dispositivo cuenta como tiempo de E/S, no como espera de CPU.
- **Agregadas:** espera media (`avgWaiting`), retorno medio (`avgTurnaround`), utilización de la CPU (`cpuUtilization`) y rendimiento (`throughput`). `cpuUtilization` puede ser < 1 aunque haya procesos vivos si todos están en el subsistema de E/S (en servicio o esperando dispositivo).
- Las métricas las renderiza el componente y se muestran al completar el recorrido de la simulación; son coherentes con el estado visualizado en cada momento.
- **Configurable:** mediante la configuración del componente se elige qué métricas mostrar, o ninguna.

### Demos (una página por algoritmo)

- Para probar el componente se crea un sitio con una página por algoritmo, cada una con un escenario de ejemplo precargado, con `ProcessForm` que abierta por defecto. Si es Round Robin Virtual y Cola de realimentación (mlfq) añadir debajo `AlgorithmParamsForm` ya mostrando sus parametros con los valores iniciales puestos. 
    - La de Round Robin Virtual lleva procesos con E/S, `ProcessForm` añadir los campos de E/S que son editables.
    - La de mlfq (solo CPU) no necesita procesos con E/S. 
  
- Cada página permite **editar** el escenario; al recargar, si hay un escenario guardado en `localStorage` en la session se restaura. El escenario de ejemplo es el punto de partida por defecto. Las páginas de Round Robin, Round Robin Virtual y `mlfq` incluyen el `AlgorithmParamsForm` para ajustar `quantum`/`quanta`/`boostInterval` y pulsar "Aplicar".

### Persistencia 
- El escenario actual (procesos, algoritmo, parámetros y, si aplica, la rama *what-if*) se **guarda entre sesiones en `localStorage`** (solo en el navegador; sin servidor).
- Al recargar se restaura el último escenario; existe una acción para volver al ejemplo por defecto.
- El estado del reproductor (tick actual) no es parte del escenario persistido.

---

## Estética de los componentes 
La estética deja de ser solo "básica": se definen **tokens de diseño** (paleta, tipografía, espaciado, estados) coherentes entre componentes. Lo que sigue es el contrato mínimo de cada componente; el refinamiento visual queda dentro de alcance siempre que respete estos requisitos.


### ProcessForm — comportamiento observable

- **Panel desplegable**, abierto por defecto. Un control visible en la demo lo abre y lo cierra.
- Al abrir, muestra **todos los procesos** del escenario con sus campos editables: `id`, `arrival_time`, `burst_time`. Si el algoritmo requiere `priority`, aparece el campo.
- Si el algoritmo modela E/S (Round Robin Virtual), cada proceso muestra además su **lista de operaciones de E/S**, con los campos `io_entry` e `io_time` por operación:
  - Un control por proceso permite **añadir una operación de E/S** al final de su lista.
  - Cada operación tiene un control para **eliminarla** individualmente.
  - `io_entry` e `io_time` son editables; `io_exit` es derivado y no se edita — se muestra solo en la `ProcessTable`.
  - **Validación de cada operación:** `io_entry` entero `> 0` y `< burst_time`; `io_time` entero `> 0`.
  - **Validación entre operaciones:** los `io_entry` del mismo proceso deben ser **estrictamente crecientes**. Si se viola, se señala el error.
  - Si se reduce `burst_time` y algún `io_entry` existente queda `≥ burst_time`, se señala el error en la operación afectada.
  - Un proceso puede tener **cero o más** operaciones de E/S. Sin operaciones, se comporta como solo CPU dentro de VRR.
- Los valores iniciales son los del escenario de ejemplo (o los guardados en `sessionStorage`).
- **Rederiva al instante:** cualquier cambio válido en un campo actualiza el Gantt y las métricas de inmediato. No hay botón "Aplicar" separado.
- Si un valor es inválido (`burst_time ≤ 0`, `id` duplicado, `arrival_time < 0`), se señala el error en el campo y la simulación **no rederiva** hasta corregirlo.
-  Un control al final permite **añadir un proceso nuevo**; otro control por proceso permite **eliminar** uno existente. Ambas acciones rederivan al instante. Si se eliminan todos los procesos, la simulación muestra estado vacío sin error.
- **Inyección en vivo:** si el reproductor está en el tick `T` y se añade un proceso con `arrival_time ≥ T`, la simulación rederiva desde ese tick. Si `arrival_time < T`, se muestra error y no se acepta.

---

### AlgorithmParamsForm — comportamiento observable

- **Visible desde el primer momento** (no hay que abrirlo ni desplegarlo), siempre que el algoritmo activo tenga parámetros configurables (`quantum` en Round Robin / VRR; `quanta` —2 campos: quantum del nivel 0 y quantum del nivel 1— + `boostInterval` en MLFQ). El nivel 2 es FCFS y no tiene quantum.

- Los campos muestran los valores iniciales del escenario de ejemplo ya rellenos.
- **No rederiva tecla a tecla:** el valor editado queda "pendiente" (visualmente distinto del aplicado) hasta que el usuario pulsa **"Aplicar"**.
- Al pulsar "Aplicar" con un valor inválido: muestra el error y **no rederiva**.
- Al pulsar "Aplicar" con un valor válido: el Gantt y las métricas se actualizan al resultado con el nuevo parámetro y el estado "pendiente" se limpia.
- `boostInterval` vacío en el formulario de MLFQ equivale a omitirlo (sin *priority boost*), no es un error de validación.
- Al seleccionar un algoritmo diferente, los campos del formulario se resetean a los del nuevo algoritmo.

---

### Mensajes ricos — comportamiento observable

- `HistoryEvent.message` (el texto que aparece encima del Gantt) describe la **mecánica
  interna** del algoritmo activo, no solo una etiqueta genérica.
- Si el algoritmo no tiene mecánica propia (FCFS, SJF, LJF, Prioridad NP), el mensaje es
  genérico: "P2 entra en CPU", "P1 finaliza en tick 5", "CPU inactiva".

**Ejemplos por algoritmo:**

| Algoritmo(s) | Ejemplos de mensaje |
|---|---|
| FCFS, SJF, LJF, Prioridad (NP) | "P1 entra en CPU", "P2 completa en tick 5", "CPU inactiva" |
| SRTF, Prioridad (P) | "P2 expropia a P1: menor tiempo restante" |
| Round Robin | "P1 agota su quantum y se reencola" |
| **Round Robin Virtual** | "P3 vuelve de E/S y se inserta en la cola auxiliar con sobrante de 2", "P3 entra en CPU desde la cola auxiliar (sobrante 2)", "P2 entra en CPU desde la cola principal" |
| **MLFQ** | "P1 agota su quantum y se degrada al nivel 1", "P1 expropia a P2: llega al nivel 0", "Priority boost: todos los procesos suben al nivel 0" |

### ProcessTable 
Tabla HTML estándar con cabecera. Columnas: `id`, `arrival_time`, `burst_time`, `priority` (condicional) y columnas de E/S (condicionales: solo si el algoritmo modela E/S): **entrada E/S**, **tiempo E/S** y **salida E/S** (derivada). Si hay varias operaciones de E/S por proceso, se listan en orden. Filas alternadas con fondo ligeramente distinto para legibilidad. Sin bordes gruesos.

### GanttChart (matriz sincronizada con el reproductor)

Layout del componente, de arriba abajo:

1. **Mensaje del evento** — el texto de `HistoryEvent.message` del tick actual. **Mensaje narrativo:** no es una etiqueta genérica ("Seleccionado: P1"); describe la **mecánica interna** que causó el cambio de color de ese tick, con el vocabulario propio de cada algoritmo (ver tabla). El mensaje es **solo texto** (un string ya formado por el motor); no lleva datos estructurados aparte — quien necesite el nivel, el sobrante o el dispositivo exactos los obtiene de `SchedulerState`, no parseando el mensaje.

 | Algoritmo(s) | Ejemplos de mensaje |
 |---|---|
 | FCFS, SJF, LJF, Prioridad (NP) | "P1 entra en CPU (cola FIFO)", "P2 entra en CPU: menor ráfaga restante", "P3 entra en CPU: mayor ráfaga", "P1 entra en CPU: mayor prioridad", "P2 completa en tick 5", "CPU inactiva" |
 | SRTF, Prioridad (P) | "P2 expropia a P1: menor tiempo restante", "P1 expropia a P3: mayor prioridad", además de los mensajes de entrada/finalización/inactividad |
 | Round Robin | "P1 agota su quantum y se reencola", "P2 entra en CPU (FIFO)", además de finalización/inactividad |
 | **Round Robin Virtual** | "P1 agota su quantum y se reencola en la cola principal", "P3 vuelve de E/S y se inserta en la cola auxiliar con sobrante de 2", "P3 entra en CPU desde la cola auxiliar (sobrante 2)", "P2 entra en CPU desde la cola principal", "P1 inicia E/S en io0", "P2 espera dispositivo io0" |
 | **MLFQ** | "P1 agota su quantum y es degradado al nivel 1", "P2 entra en CPU (nivel 0)", "P1 expropia a P2: llega al nivel 0", "Priority boost: todos los procesos suben al nivel 0", además de finalización/inactividad |

 El **mensaje terminal** (`t = M`, todo completado) describe el fin de la simulación, p. ej.
 "Simulación completa: todos los procesos finalizados".
2. **Matriz** — la grilla de celdas.
3. **Leyenda** — una tabla/matriz pequeña debajo del diagrama:
 - **Filas (vertical):** un proceso por fila con su color (■ P1, ■ P2, ■ P3).
 - **Columnas (horizontal):** los estados (Inactivo, En espera, Esperando E/S, En E/S, En CPU). Las dos columnas de E/S solo aparecen cuando el algoritmo modela E/S; en los clásicos la leyenda es la de v01.
 - Cada celda de la leyenda muestra el color que tendría esa combinación proceso/estado en el diagrama principal.

 Ejemplo visual **(v2, con E/S y contención)**:

 | | Inactivo | En espera | Esperando E/S | En E/S | En CPU |
 |----------|----------|-----------|---------------|----------|----------|
 | ■ P1 | gris | claro | punteado | rayado | sólido |
 | ■ P2 | gris | claro | punteado | rayado | sólido |
 | ■ P3 | gris | claro | punteado | rayado | sólido |

**Estructura de la matriz:** - **Tamaño fijo desde el inicio:** la tabla se dibuja completa con todas sus filas (un proceso por fila) y todas sus columnas (un tick por columna, de `0` al último tick del historial). Las dimensiones se conocen porque el historial está precalculado, así que **la tabla no cambia de tamaño durante la reproducción**.
- **Cabecera superior:** los números de tick (`0`, `1`, `2`, …) como cabeceras de columna.
- **Cabecera lateral:** los `id` de proceso (`P1`, `P2`, …) como cabeceras de fila.
- **Celdas:** solo color de fondo, **sin texto** dentro. El estado se comunica exclusivamente con el color (y la trama, en el caso de E/S).

**Sincronización:** la tabla está siempre a tamaño completo; lo que cambia con el reproductor es **el color de las celdas**. Las celdas de los ticks **hasta el actual** muestran su estado (color/trama); las de los ticks **posteriores** quedan **vacías** (no se revela el futuro). Paso adelante colorea la columna del siguiente tick; paso atrás vacía la última columna coloreada. En el tick 0 solo está coloreada la primera columna; en el último, toda la matriz.

**Colores de celda según estado:** - **En CPU** — color sólido asignado al proceso (cada proceso un color distinto).
- **En espera (ready)** — mismo color del proceso pero más claro (opacidad reducida).
- **En E/S / en servicio (blocked, usando dispositivo)** — color del proceso con **trama diagonal** (rayado), distinguible de "en espera" y "en CPU".
- **Esperando E/S (en cola de un dispositivo ocupado)** — color del proceso con trama **punteada**, distinta del rayado del servicio, para ver la contención.
- **No llegado (pending)** — celda vacía (sin color).
- **Completado** — celda vacía (sin color).
- **CPU inactiva** — fondo gris distinguible.

Los colores de proceso se asignan automáticamente de una paleta predefinida (mínimo 10 colores distintos de alto contraste para cubrir los 10 procesos típicos de los ejercicios).

### PlaybackControls 
Una fila horizontal de botones icono svg, en este orden:

| Botón | Icono | Acción |
|-------|-------------|--------|
| Ir al inicio | `⏮` | Salta al tick 0 |
| Paso atrás | `◀` | Retrocede 1 tick |
| Reproducir / Pausar | `▶` / `⏸` | Alterna entre reproducir y pausar |
| Paso adelante | `▶\|` | Avanza 1 tick |
| Ir al final | `⏭` | Salta al último tick |

Debajo de los botones:
- **Barra de desplazamiento** (input range) — ocupa todo el ancho, va de tick 0 al último tick.
- **Indicador de tick actual** — texto `Tick: N / Total`.

Botones deshabilitados visualmente (opacidad reducida) cuando no aplican: paso atrás en tick 0, paso adelante en el último tick.

### MetricsTable 
Dos tablas HTML:
- **Por proceso:** columnas `id`, `completion`, `turnaround`, `waiting`, `response`.
- **Agregadas:** una fila con `avgWaiting`, `avgTurnaround`, `cpuUtilization`, `throughput`.

Solo visibles cuando el cursor está en el último tick. Ocultas durante el recorrido.

### AlgorithmParamsForm

Un control por parámetro configurable del algoritmo activo:
- **`quantum`** (Round Robin, Round Robin Virtual) — un único campo numérico, entero `> 0`.
- **`quanta`** (MLFQ) — **exactamente dos campos numéricos fijos**, `Quantum nivel 0` y `Quantum nivel 1` (cada uno entero `> 0`, es el quantum del Round Robin de ese nivel). El número de niveles **no es configurable** (3 niveles fijos; el nivel 2 es FCFS sin quantum), por lo que no se añaden ni quitan campos: siempre son dos. Se emiten como `params.quanta = [nivel0, nivel1]`.
- **`boostInterval`** (MLFQ, opcional) — campo numérico, entero `> 0`; vacío equivale a "sin *priority boost*". Solo aparece en MLFQ, no en Round Robin / Round Robin Virtual.

Junto a los campos, un botón **"Aplicar"**. Mientras el valor editado difiere del aplicado, el botón se muestra habilitado y los campos editados se marcan como **pendientes** (p. ej. borde distinto); la simulación visible sigue siendo la del último valor **aplicado**, no la del valor a medio escribir. Al pulsar "Aplicar": si el valor es inválido (p. ej. `quantum ≤ 0`, una entrada de `quanta ≤ 0`, `boostInterval ≤ 0`), se muestra el error y no se rederiva; si es válido, se rederiva y el estado pendiente se limpia. Si el algoritmo activo no declara parámetros configurables desde la demo, el componente no se muestra.

---

## Modelo de datos (resumen funcional)

- **Proceso:** `id`, `arrival_time` (≥ 0), `burst_time` (> 0; demanda total de CPU), `priority` (opcional), `io` (opcional; lista de operaciones de E/S).
 - **`io`:** lista de operaciones, cada una con `io_entry` (CPU acumulada ejecutada antes de bloquearse; entero `> 0` y `< burst_time`), `io_time` (duración del servicio de E/S, entero `> 0`) y `device` (opcional; dispositivo destino, por defecto el único). `io_entry` e `io_time` son **ambos obligatorios** en cada operación: declarar uno sin el otro (p. ej.
 `io_entry` sin `io_time`) es una **operación incompleta → configuración inválida**. `io_exit` (instante de retorno) es **derivado** (entrada + espera de dispositivo + servicio). Los `io_entry` de la lista son **estrictamente crecientes**. Internamente equivale a una secuencia alternada CPU/E·S. **Solo lo usan los algoritmos con `requires.io = true`**; los clásicos lo ignoran.
- **Dispositivo de E/S:** `id`; sirve a un proceso a la vez y tiene una cola FCFS.
- **Configuración:** 
    - Algoritmo seleccionado y sus parámetros (`quantum`; `quanta` [2 enteros] y `boostInterval` en MLFQ, ambos configurables desde la demo); 
    - Lista de **dispositivos de E/S** (por defecto, uno pero se puede añadir más E/S solo relevante en algoritmos que modelan E/S).
- **Estado del planificador (por tick):** instante actual, proceso en CPU (o inactivo), cola de listos, ráfagas restantes, procesos pendientes de llegar y procesos completados con su información de finalización. **Solo en algoritmos que modelan E/S:** por cada **dispositivo de E/S**, el proceso en servicio (o ninguno), su tiempo de servicio restante y - **Estado del planificador (por tick):** instante actual, proceso en CPU (o inactivo), cola de listos, ráfagas restantes, procesos pendientes de llegar y procesos completados con su información de finalización. **Solo en Round Robin Virtual** (único algoritmo con E/S): el estado incluye también el proceso en E/S (si lo hay) y el tiempo de servicio restante. En los clásicos y en MLFQ el estado es el mismo que en v01.
- **Resultado de la simulación:** diagrama de Gantt (intervalos), historial de estados y métricas por proceso y agregadas.
- **Escenario (unidad de persistencia local):** procesos + algoritmo + parámetros (+ rama *what-if* si la hay). Es lo que se guarda en `localStorage` y se restaura al recargar. El resultado de la simulación **no** se persiste: se rederiva del escenario en el cliente.

---

## Reglas de determinismo y casos límite 
- **Determinismo:** un mismo escenario (procesos + algoritmo + parámetros) o una misma rama *what-if* (mismo estado de partida) produce siempre exactamente el mismo resultado. La edición y la inyección en vivo no introducen no-determinismo: cada cambio define un escenario/rama nuevo que se rederiva de forma determinista.
- **Desempates (orden global, aplicado tras el criterio propio del algoritmo):** 1. criterio del algoritmo (burst_time, priority, etc.); 2. menor arrival_time; 3. menor identificador / orden de inserción (desempate final que garantiza un resultado único).
- **Round Robin, coincidencia en un tick:** cuando una llegada y la expiración del *quantum* ocurren en el mismo tick, el proceso que llega entra en la cola de listos **antes** que el proceso cuyo *quantum* expira.
- **Orden intra-tick (posiciones en la cola de listos dentro de un mismo tick):** **retornos de E/S → llegadas → reencolado por quantum**, cada grupo en orden ascendente de `id`. Generaliza la regla de Round Robin anterior.
- **Empate ráfaga/quantum:** si en el mismo tick se agotan la ráfaga de CPU **y** el quantum, manda el **fin de ráfaga** (bloqueo o finalización) sobre la expiración de quantum.
- **CPU inactiva:** si en un tick no hay ningún proceso en la cola de listos (incluido el caso de que todos los vivos estén bloqueados en E/S), la CPU queda inactiva y el hueco se refleja en el diagrama de Gantt.
- **Conjunto vacío:** sin procesos, la simulación no produce línea temporal y la interfaz muestra un estado vacío, sin errores.
- **Casos triviales válidos:** un único proceso; todos los procesos llegando en `t = 0`; *quantum* mayor que todas las ráfagas (Round Robin se comporta como FCFS).

---

## Requisitos no funcionales (a nivel de producto)

- **Determinismo** como garantía funcional (ver reglas arriba).
- **Rendimiento percibido:** el cálculo (y la rederivación) de la línea temporal es instantáneo para el usuario.
- **Todo en el navegador:** la simulación y la persistencia (`localStorage`) funcionan sin conexión. No hay servidor.

---

## Fuera de alcance (v2)

**Entran en alcance** respecto a v01: ráfagas de E/S y estado de bloqueo (VRR y MLFQ); colas multinivel con realimentación y su **envejecimiento / *priority boost*** (`boostInterval`); **edición de la entrada**, **escenarios *what-if*** e **inyección de procesos en vivo**; **persistencia en `localStorage`**;

**Sigue fuera de alcance:** 
- **Multiprocesador, múltiples núcleos y afinidad de CPU.** - **Backend, nube, colaboración multiusuario y exportación** (SVG/PNG/CSV/JSON). Toda la lógica vive en el navegador; no hay servidor.
- **E/S como recurso con contención** (varios procesos compitiendo por un dispositivo compartido).
- **Envejecimiento de prioridades distintos de `boostInterval`** (envejecimiento continuo por tiempo de espera, sin *priority boost* periódico).
- **Modificar soluciones parciales y re-derivar (*what-if* de estado interno del algoritmo)**: el *what-if* actúa sobre el `SchedulerState` del tick, no sobre el estado interno de las colas del algoritmo.
- Inyección de procesos en vivo durante la reproducción hacia atrás.