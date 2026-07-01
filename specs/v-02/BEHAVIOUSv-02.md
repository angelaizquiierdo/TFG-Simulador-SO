# Acceptance Criteria — v02

## § Registro de algoritmos

> **Patrón fábrica:** el registro almacena `AlgorithmFactory = (params?: AlgorithmParams) => IAlgorithm`.
> `register(factory)` llama a `factory()` una vez para leer el nombre.
> `get(name, params?)` llama a la fábrica con los params y devuelve una instancia **nueva** en cada llamada.
> Esto garantiza que los algoritmos con estado interno (VRR, MLFQ) arranquen limpios en cada simulación.

DADO una fábrica de algoritmo válida
CUANDO se registra en el sistema
ENTONCES se puede obtener una instancia de ese algoritmo posteriormente por su nombre exacto

DADO que se registra una fábrica bajo un nombre que ya existe
CUANDO se realiza el nuevo registro
ENTONCES la nueva fábrica sobrescribe a la anterior silenciosamente

DADO que el sistema intenta recuperar un algoritmo no registrado
CUANDO el registro de algoritmos no está completamente vacío
ENTONCES se produce un error que lista los nombres de los algoritmos disponibles actualmente

DADO que el sistema intenta recuperar un algoritmo no registrado
CUANDO el registro de algoritmos está completamente vacío
ENTONCES se produce un error que indica explícitamente "(ninguno)" en la lista de algoritmos disponibles

DADO que se registra una fábrica bajo un `name`
CUANDO se solicita ese mismo `name` al registro
ENTONCES se obtiene una instancia válida del algoritmo sin error

DADO que se solicita el mismo nombre al registro dos veces
CUANDO se realizan las dos llamadas a `get`
ENTONCES se devuelven dos instancias distintas (no la misma referencia), garantizando el aislamiento entre simulaciones

## § CPU inactiva

DADO un único proceso P1(llegada 2, ráfaga 2) con FCFS
CUANDO se ejecuta la simulación
ENTONCES la CPU está inactiva en el intervalo [0–2]
ENTONCES el diagrama de Gantt muestra el hueco de inactividad y P1[2–4]

DADO un único proceso P1(llegada 4, ráfaga 3, prioridad 2) con Prioridad no expropiativa
CUANDO se ejecuta la simulación
ENTONCES la CPU está inactiva en el intervalo [0–4]
ENTONCES el diagrama de Gantt muestra el hueco de inactividad y P1[4–7]

## § Determinismo sin E/S

DADO un conjunto de procesos y un algoritmo cualesquiera
CUANDO se ejecuta la simulación dos veces
ENTONCES ambos resultados son idénticos tick a tick

DADO dos algoritmos distintos con la misma entrada
CUANDO cada uno se ejecuta dos veces
ENTONCES cada uno produce siempre el mismo resultado (determinismo por algoritmo)

DADO los procesos P1(llegada 0, ráfaga 3) y P2(llegada 0, ráfaga 3) con SJF
CUANDO se ejecuta la simulación
ENTONCES el desempate se resuelve por menor arrival_time y luego por menor id
ENTONCES el diagrama de Gantt es P1[0–3], P2[3–6] (P1 antes que P2 porque tiene menor id)

DADO dos procesos con el mismo tiempo de llegada y ráfaga, cuyos IDs comparten el mismo número pero distinta letra (ej. "P1B" y "P1A")
CUANDO el motor necesita resolver el desempate
ENTONCES el proceso "P1A" se ejecuta antes que "P1B" aplicando una comparación natural

DADO que hay un único proceso en el escenario
CUANDO el motor simula
ENTONCES el resultado es determinista y equivalente a una simulación con un único proceso sin competencia

DADO que el quantum de Round Robin es mayor que la ráfaga de todos los procesos
CUANDO el motor simula
ENTONCES el resultado es idéntico al de FCFS con el mismo conjunto de procesos

## § Simular — FCFS

DADO los procesos P1(llegada 0, ráfaga 3), P2(llegada 2, ráfaga 2) y P3(llegada 1, ráfaga 4) con FCFS
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–3], P3[3–7], P2[7–9]
ENTONCES el tiempo de espera medio es 2.33
ENTONCES el tiempo de retorno medio es 5.33

DADO los procesos P1(llegada 0, ráfaga 3), P2(llegada 5, ráfaga 2) y P3(llegada 6, ráfaga 4) con FCFS
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–3], P2[5–7], P3[7–11]
ENTONCES el tiempo de espera medio es 0.33
ENTONCES el tiempo de retorno medio es 3.33

## § Simular — SRTF

DADO los procesos P1(llegada 0, ráfaga 8), P2(llegada 1, ráfaga 4), P3(llegada 2, ráfaga 2) y P4(llegada 4, ráfaga 1) con SRTF
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–1], P2[1–2], P3[2–4], P4[4–5], P2[5–8], P1[8–15]
ENTONCES P3 finaliza en el tick 4, P4 en el tick 5, P2 en el tick 8 y P1 en el tick 15

DADO los procesos P1(llegada 0, ráfaga 2), P2(llegada 4, ráfaga 3) y P3(llegada 5, ráfaga 1) con SRTF
CUANDO se ejecuta la simulación
ENTONCES la CPU está inactiva en el intervalo [2–4]
ENTONCES el diagrama de Gantt es P1[0–2], Inactivo[2–4], P2[4–5], P3[5–6], P2[6–8]

DADO los procesos P1(llegada 2, ráfaga 2), P2(llegada 6, ráfaga 4) y P3(llegada 12, ráfaga 2) con SRTF
CUANDO se ejecuta la simulación
ENTONCES la CPU está inactiva en los intervalos [0–2], [4–6] y [10–12]
ENTONCES el diagrama de Gantt es Inactivo[0–2], P1[2–4], Inactivo[4–6], P2[6–10], Inactivo[10–12], P3[12–14]

## § Simular — Round Robin

DADO los procesos P1(llegada 0, ráfaga 5), P2(llegada 1, ráfaga 4) y P3(llegada 2, ráfaga 2) con Round Robin y quantum 2
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–2], P2[2–4], P3[4–6], P1[6–8], P2[8–10], P1[10–11]
ENTONCES el tiempo de espera medio es 4.33
ENTONCES el tiempo de retorno medio es 8.00

DADO los procesos P1(llegada 0, ráfaga 2), P2(llegada 5, ráfaga 4) y P3(llegada 12, ráfaga 3) con Round Robin y quantum 3
CUANDO se ejecuta la simulación
ENTONCES la CPU está inactiva en los intervalos [2–5] y [9–12]
ENTONCES el diagrama de Gantt es P1[0–2], Inactivo[2–5], P2[5–8], P2[8–9], Inactivo[9–12], P3[12–15]

DADO los procesos P1(llegada 0, ráfaga 3), P2(llegada 0, ráfaga 2) y P3(llegada 0, ráfaga 1) con Round Robin y quantum 1
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–1], P2[1–2], P3[2–3], P1[3–4], P2[4–5], P1[5–6]
ENTONCES P3 finaliza en el tick 3, P2 en el tick 5 y P1 en el tick 6

## § Contención del dispositivo de E/S

DADO que un proceso alcanza su `io_entry` y el dispositivo está libre
CUANDO el motor lo procesa
ENTONCES el proceso entra directo a servicio (`inIO`), sin pasar por `waitingIO`

DADO que un proceso alcanza su `io_entry` y el dispositivo está ocupado sirviendo a otro proceso
CUANDO el motor lo procesa
ENTONCES el proceso entra al final de la cola FCFS del dispositivo (`waitingIO`) y no consume tiempo de servicio hasta que el dispositivo lo admite

DADO que dos procesos alcanzan su `io_entry` en el mismo tick y el dispositivo está libre
CUANDO el motor decide a cuál admite primero
ENTONCES gana el de menor `arrival_time` y, si persiste el empate, el de menor `id`; el otro entra en `waitingIO`

DADO que el dispositivo termina de servir al proceso en curso
CUANDO queda libre
ENTONCES admite al primero de `waitingIO` (si lo hay) y ese proceso pasa a `inIO`; el proceso recién servido vuelve a la cola de listos de la CPU

DADO que el dispositivo lleva varios ticks ocupado sirviendo a un proceso
CUANDO otros procesos van alcanzando su `io_entry` mientras tanto
ENTONCES `waitingIO` puede acumular más de un proceso, en el orden en que fueron llegando (FCFS), no solo en el caso de un empate exacto en el mismo tick

DADO que Round Robin Virtual está activo con dos procesos que solicitan el mismo dispositivo en ticks distintos
CUANDO el segundo solicita la E/S mientras el primero sigue en servicio
ENTONCES el segundo espera en `waitingIO`, su tiempo de espera cuenta como `bloqueado_total` (no como `waiting` de CPU), y su `completion` se retrasa respecto a un escenario sin contención

> Nota (fixture verificado): `quantum 10` (no expira), dispositivo único.
> `P1 { arrival:0, burst:5, io:[{io_entry:2, io_time:4}] }`,
> `P2 { arrival:0, burst:5, io:[{io_entry:1, io_time:2}] }`.
> Traza: `[0,2)` P1 CPU → servicio io0 `[2,6)`. `[2,3)` P2 CPU → `io_entry=1` con dispositivo ocupado → `waitingIO=[P2]` durante `[3,6)`; CPU inactiva `[3,6)` (nadie en ready). `t=6`: P1 termina servicio (vuelve a `auxQueue`, sobrante 8); dispositivo admite a P2 → servicio `[6,8)`. `[6,9)` P1 CPU (resto 3) → completa `t=9`. `t=8`: P2 termina servicio (vuelve a `auxQueue`, sobrante 9). `[9,13)` P2 CPU (resto 4) → completa `t=13`. Métricas: P1 `{completion 9, turnaround 9, waiting 0, response 0}`; P2 `{completion 13, turnaround 13, waiting 3, response 2}`. `cpuUtilization = 10/13`.

## § Orden intra-tick y empate ráfaga/quantum

DADO que en el mismo tick un proceso vuelve de E/S (solo Round Robin Virtual) y otro proceso llega por primera vez
CUANDO el motor resuelve ese tick
ENTONCES el retorno de E/S entra en la cola de listos antes que la llegada nueva 

DADO que en el mismo tick una llegada nueva y la expiración de quantum del proceso en CPU ocurren a la vez
CUANDO el motor resuelve ese tick
ENTONCES la llegada entra en la cola de listos antes que el reencolado por quantum

DADO que en el mismo tick el proceso en CPU alcanza su `io_entry` y también agota su quantum
CUANDO el motor resuelve ese tick (solo Round Robin Virtual)
ENTONCES manda el fin de ráfaga: el proceso se bloquea para E/S y no se reencola

## § Determinismo con E/S (VRR)

DADO los procesos P1(llegada 0, ráfaga 6, io:[{io_entry:2, io_time:3}]), P2(llegada 0, ráfaga 4, io:[{io_entry:1, io_time:4}]), P3(llegada 0, ráfaga 3) con Round Robin Virtual y quantum 4
CUANDO se ejecuta la simulación dos veces
ENTONCES ambos resultados son idénticos tick a tick, incluyendo el orden de la cola del dispositivo, los valores de sobrante y las expropiaciones por io-return

DADO dos procesos que alcanzan su io_entry en el mismo tick y el dispositivo está libre
CUANDO el motor decide a cuál admitir primero
ENTONCES el desempate es determinista: menor arrival_time, luego menor id

DADO un proceso en CPU bajo el modo io-return
CUANDO otro proceso retorna de E/S forzando la reevaluación del motor, pero el algoritmo decide mantener al proceso que ya está en la CPU
ENTONCES la CPU no es expropiada y el proceso actual continúa ejecutando su ráfaga.

## § Determinismo con niveles (MLFQ)

DADO los procesos P1(llegada 0, ráfaga 8), P2(llegada 0, ráfaga 8) con MLFQ, quanta [2, 10] y sin boostInterval
CUANDO se ejecuta la simulación dos veces
ENTONCES ambos resultados son idénticos, incluyendo el orden de degradación y la asignación de niveles

DADO los mismos procesos P1 y P2 con MLFQ, quanta [2, 10] y boostInterval 6
CUANDO se ejecuta la simulación dos veces
ENTONCES ambos resultados son idénticos, incluyendo el tick exacto del boost, la interrupción del proceso en CPU y el orden de reencolado tras el boost (por menor id)

DADO un proceso ejecutándose bajo el modo on-quantum-and-better
CUANDO llega un nuevo proceso en un tick posterior y el algoritmo lo prefiere (ej. entra en un nivel de mayor prioridad)
ENTONCES el motor expropia inmediatamente al proceso actual emitiendo un evento preempted y cede la CPU al recién llegado.

DADO un proceso ejecutándose bajo el modo on-quantum-and-better
CUANDO llega un nuevo proceso en un tick posterior pero el algoritmo determina que el actual sigue teniendo prioridad
ENTONCES no se produce ninguna expropiación y el proceso actual continúa en la CPU.

## § Mensajes ricos — `HistoryEvent.message`

DADO que el algoritmo activo no devuelve motivo en `onEvent` (devuelve `null`)
CUANDO el motor compone el mensaje del tick
ENTONCES el mensaje es la frase genérica del motor para ese tipo de evento ("P2 entra en CPU", "P2 completa en tick 5", "CPU inactiva")

DADO que Round Robin Virtual está activo y un proceso vuelve de E/S con sobrante > 0
CUANDO el motor compone el mensaje del tick
ENTONCES el mensaje menciona explícitamente "cola auxiliar" y el valor numérico del sobrante

DADO que Round Robin Virtual está activo y se elige un proceso desde la cola auxiliar
CUANDO el motor compone el mensaje del tick
ENTONCES el mensaje indica que el proceso entra desde la cola auxiliar y repite el sobrante

DADO que Round Robin Virtual está activo y se elige un proceso desde la cola principal
CUANDO el motor compone el mensaje del tick
ENTONCES el mensaje indica que el proceso entra desde la cola principal

DADO que MLFQ está activo y un proceso agota el quantum de su nivel
CUANDO el motor compone el mensaje del tick
ENTONCES el mensaje menciona explícitamente que el proceso "se degrada al nivel N" donde N es el nuevo nivel

DADO que MLFQ está activo y se aplica un *priority boost*
CUANDO el motor compone el mensaje del tick
ENTONCES el mensaje menciona explícitamente "priority boost" y que todos los procesos suben al nivel 0; este mensaje es distinto al de una degradación normal o expropiación

DADO que un algoritmo multicola (MLFQ o Round Robin Virtual) tiene un proceso que CONTINÚA en CPU en un tick sin evento (ni dispatch, ni expropiación, ni boost)
CUANDO el motor compone el mensaje de ese tick
ENTONCES el mensaje no se queda en la frase básica ("A en CPU") sino que indica la cola/prioridad desde la que se ejecuta: "A en CPU de la cola de prioridad N", donde N es el nivel actual del proceso (MLFQ: 0/1/2; VRR: 0 = auxiliar, 1 = principal). El motor obtiene N de `levelSnapshot()`; los algoritmos que no lo implementan conservan la frase básica sin sufijo.

DADO que el test verifica el contenido de un `message`
CUANDO comprueba si el vocabulario clave aparece
ENTONCES usa `toMatch(/cola auxiliar/)`, `toMatch(/nivel 1/)`, etc., en vez de igualdad exacta de string, para no acoplarse a la redacción exacta del motor

DADO un algoritmo que en su evento onEvent retorna un string plano en lugar del objeto { text: string }
CUANDO el motor resuelve y compone el mensaje de ese tick
ENTONCES utiliza el texto literal devuelto por el algoritmo sin inyectar el ID del proceso automáticamente.

DADO un algoritmo expropiativo (ej. SRTF) con mensajes ricos personalizados
CUANDO un proceso expropia a otro, provocando que el algoritmo emita un mensaje de salida (preempted) y otro de entrada (dispatch)
ENTONCES el motor ensambla el mensaje del tick concatenando ambos fragmentos lógicamente (ej. "{Mensaje de salida}. A continuación, {Mensaje de entrada}").

## § Historial y métricas

DADO que la simulación ha terminado
CUANDO se consultan los intervalos derivados
ENTONCES cada intervalo cubre un rango `[start, end)` contiguo y el conjunto de intervalos cubre exactamente el tiempo de 0 al makespan sin huecos ni solapamientos, salvo los periodos de CPU inactiva

DADO que un proceso termina en el tick `C` con `arrival_time = A` y CPU total ejecutada `= B`
CUANDO se consultan sus métricas
ENTONCES `completion = C`, `turnaround = C − A`, `response` = primer tick en CPU − A

DADO que un proceso sin E/S termina en el tick `C`
CUANDO se consulta su `waiting`
ENTONCES `waiting = turnaround − burst_time`

DADO que un proceso con E/S (solo Round Robin Virtual) termina en el tick `C`
CUANDO se consulta su `waiting`
ENTONCES `waiting = turnaround − CPU_total − bloqueado_total`, donde `bloqueado_total` incluye el tiempo en servicio de E/S

DADO que en un tick no hay ningún proceso en la cola de listos porque todos están bloqueados en E/S (solo Round Robin Virtual)
CUANDO se consulta el historial de ese tick
ENTONCES `onCPU = null` y el intervalo del Gantt para ese tick muestra CPU inactiva

DADO que la simulación ha terminado
CUANDO se consulta `cpuUtilization`
ENTONCES es igual a `ticks_CPU_ocupada / makespan` y puede ser menor que 1 aunque haya procesos vivos si todos estaban bloqueados en E/S

## § Coherencia de métricas y estado

DADO la simulación situada en un tick T
CUANDO se observa la lista de procesos completados
ENTONCES contiene exactamente los procesos cuya finalización ocurrió en T o antes

DADO la simulación recorrida tick a tick desde el inicio hasta el final
CUANDO se observa la lista de procesos completados en cada tick
ENTONCES la lista crece monotónicamente (nunca pierde un proceso completado)

DADO la simulación en el tick 0 con procesos que llegan en t ≥ 0
CUANDO se observa la lista de procesos completados
ENTONCES está vacía

DADO la simulación en el último tick
CUANDO se observa la lista de procesos completados
ENTONCES contiene exactamente todos los procesos de la entrada

DADO que la reproducción llega al último tick
CUANDO finaliza el recorrido
ENTONCES se muestran las métricas por proceso y agregadas

## § Rederivación — what-if e inyección en vivo

DADO que el reproductor está en el tick `T` y se edita el estado del planificador en ese punto
CUANDO se rederiva desde `T`
ENTONCES el historial hasta `T` se conserva intacto y el futuro se recalcula de forma determinista a partir del nuevo estado

DADO que se rederiva el mismo estado de partida con el mismo algoritmo dos veces
CUANDO ambas rederivaciones terminan
ENTONCES producen exactamente el mismo resultado

DADO que el usuario añade un proceso con `arrival_time ≥ tick_actual`
CUANDO se inyecta en vivo y se rederiva
ENTONCES el nuevo proceso aparece en el historial a partir de su `arrival_time` y el resultado es determinista

DADO que el usuario intenta inyectar un proceso con `arrival_time < tick_actual`
CUANDO el motor recibe la inyección
ENTONCES la rechaza con un error claro; no rederiva con datos incoherentes

DADO que se navega por la línea temporal (paso adelante o atrás)
CUANDO el reproductor cambia de tick
ENTONCES no se produce ninguna rederivación; el historial ya calculado no cambia

DADO un estado del planificador inyectado manualmente (mediante runFrom) que contiene un ID en la lista ready
CUANDO ese ID no existe en la lista oficial de procesos
ENTONCES el motor lanza un error indicando que el proceso no ha sido encontrado al intentar construir los candidatos.

## § Conjunto vacío

DADO que el componente se configura sin ningún proceso
CUANDO se carga la página
ENTONCES se muestra un estado vacío
ENTONCES no se produce ningún error

## § Validación de configuración

DADO que se configura un proceso con `burst_time ≤ 0`
CUANDO el motor intenta simular
ENTONCES se produce un error de configuración sin iniciar la simulación

DADO que se configura un proceso con `arrival_time < 0`
CUANDO el motor intenta simular
ENTONCES se produce un error de configuración sin iniciar la simulación

DADO que el algoritmo requiere `priority` y un proceso no la declara
CUANDO el motor intenta simular
ENTONCES el proceso se trata como si tuviera la prioridad más baja (`priority = Infinity`) y la simulación no lanza error

DADO que el algoritmo es Round Robin Virtual o MLFQ y `validateParams` recibe un `quantum ≤ 0` o `quanta` con alguna entrada `≤ 0`
CUANDO el motor intenta simular
ENTONCES se produce un error de validación y no se rederiva

DADO que el algoritmo es MLFQ y `validateParams` recibe `quanta` como lista vacía
CUANDO el motor intenta simular
ENTONCES se produce un error de validación indicando que se requiere al menos un nivel

DADO que un proceso declara `io_entry` pero omite `io_time` (o al revés)
CUANDO el motor intenta simular con Round Robin Virtual
ENTONCES se produce un error de configuración indicando que la operación de E/S está incompleta

DADO que un proceso declara `io_entry ≤ 0` 
CUANDO el motor intenta simular con Round Robin Virtual
ENTONCES se produce un error de configuración

DADO que un proceso declara  `io_entry ≥ burst_time` 
CUANDO el motor intenta simular con Round Robin Virtual
ENTONCES se produce un error de configuración

DADO que un proceso declara varios `io_entry` que no son estrictamente crecientes
CUANDO el motor intenta simular con Round Robin Virtual
ENTONCES se produce un error de configuración

## § Seguridad y tolerancia a fallos (Motor interno)

DADO un escenario extremo que requiere más de 100,000 ticks para completarse
CUANDO el motor ejecuta la simulación
ENTONCES se interrumpe la ejecución y se lanza un error indicando que se excedió el límite de ticks para evitar bucles infinitos

DADO un algoritmo defectuoso o malicioso que selecciona un ID de proceso que no existe
CUANDO el motor intenta asignar ese proceso a la CPU
ENTONCES el motor protege su estado interno dejando la CPU inactiva (lo que eventualmente disparará la protección de límite de ticks si el algoritmo no se recupera)

DADO un escenario anómalo que impide que los procesos completen su ráfaga (por ejemplo, un algoritmo malicioso)
CUANDO el bucle de simulación supera el límite estricto de 100,000 ticks
ENTONCES la simulación se aborta inmediatamente lanzando un error para evitar el bloqueo del sistema.

## § Simulador independiente de la vista

DADO un script de Node sin ninguna librería de interfaz
CUANDO importa el simulador y ejecuta una simulación
ENTONCES obtiene el resultado (intervalos, historial y métricas) sin dependencias de presentación

## § Estructura del resultado de simulación

DADO un conjunto que contiene al menos un proceso válido y cualquier algoritmo
CUANDO el motor principal completa la simulación
ENTONCES el resultado devuelto contiene una lista de intervalos de ejecución no vacía
ENTONCES el resultado devuelto contiene un historial temporal de eventos no vacío
ENTONCES el resultado devuelto contiene las métricas individuales y agregadas calculadas

## § Navegación manual

DADO la simulación situada en el tick 3
CUANDO el usuario pulsa "paso adelante"
ENTONCES se muestra el tick 4 y el estado (CPU, colas) corresponde al tick 4

DADO la simulación situada en el tick 3
CUANDO el usuario pulsa "paso atrás"
ENTONCES se muestra el tick 2

DADO la simulación situada en el tick 0
CUANDO el usuario pulsa "paso atrás"
ENTONCES permanece en el tick 0

DADO la simulación situada en el último tick
CUANDO el usuario pulsa "paso adelante"
ENTONCES permanece en el último tick

DADO una simulación ya calculada
CUANDO el usuario arrastra la barra hasta el tick N
ENTONCES se muestra el estado del tick N sin recalcular la simulación

DADO la simulación situada en el tick N
CUANDO se consulta el estado actual del Player
ENTONCES devuelve el HistoryEvent correspondiente al tick N

DADO el cursor de un historial de simulación vacío
CUANDO se intenta saltar directamente a un tick específico (goTo)
ENTONCES la orden se ignora y el cursor permanece en el tick 0

## § Utilidad FifoQueue
DADO una instancia nueva de `FifoQueue`
CUANDO se inicializa y se comprueba su estado
ENTONCES `isEmpty` es verdadero y `toArray()` devuelve un array vacío

DADO una cola vacía
CUANDO se intenta desencolar (`dequeue`) o inspeccionar (`peek`)
ENTONCES devuelve undefined y la cola sigue vacía

DADO una cola vacía
CUANDO se encolan secuencialmente los elementos "A", "B" y "C"
ENTONCES `isEmpty` es falso
ENTONCES `toArray()` devuelve ["A", "B", "C"] respetando el orden de entrada

DADO una cola con los elementos "A", "B" y "C"
CUANDO se llama al método `peek`
ENTONCES devuelve "A" sin extraerlo de la cola
ENTONCES el tamaño de la cola se mantiene intacto

DADO una cola con los elementos "A", "B" y "C"
CUANDO se llama al método `dequeue` repetidamente
ENTONCES el primer llamado devuelve "A", el segundo "B", y el tercero "C" (First-In-First-Out estricto)
ENTONCES al finalizar las extracciones `isEmpty` vuelve a ser verdadero

## § Algoritmos clásicos — solo CPU

DADO que el algoritmo activo es cualquiera de los clásicos (FCFS, SJF, LJF, Prioridad NP, SRTF, Prioridad P, Round Robin)
CUANDO un proceso tiene declarada la lista `io` con operaciones de E/S
ENTONCES el algoritmo ignora completamente esos campos y produce el mismo resultado que si no existieran

DADO que el algoritmo activo es FCFS
CUANDO hay varios procesos en la cola de listos
ENTONCES se elige siempre el proceso con menor `arrival_time`; en caso de empate, el de menor `id`

DADO que el algoritmo activo es SJF
CUANDO hay varios procesos en la cola de listos
ENTONCES se elige el proceso con menor ráfaga restante (`remaining`); en caso de empate, menor `arrival_time` y luego menor `id`

DADO que el algoritmo activo es LJF
CUANDO hay varios procesos en la cola de listos
ENTONCES se elige el proceso con mayor `burst_time`; en caso de empate, menor `arrival_time` y luego menor `id`

DADO que el algoritmo activo es Prioridad (no expropiativa)
CUANDO hay varios procesos en la cola de listos
ENTONCES se elige el proceso con menor valor de `priority`; en caso de empate, menor `arrival_time` y luego menor `id`

DADO que el algoritmo activo es SRTF
CUANDO llega un proceso con menor `remaining` que el proceso en CPU
ENTONCES el proceso en CPU es expropiado y el recién llegado ocupa la CPU

DADO que el algoritmo activo es Prioridad (expropiativa)
CUANDO llega un proceso con mayor prioridad (menor valor) que el proceso en CPU
ENTONCES el proceso en CPU es expropiado y el recién llegado ocupa la CPU

DADO que el algoritmo activo es Round Robin con `quantum = Q`
CUANDO un proceso agota su quantum sin completar
ENTONCES vuelve al final de la cola de listos y el siguiente proceso de la cabeza ocupa la CPU

## § Simular — SJF (no expropiativo)

DADO los procesos P1(llegada 0, ráfaga 5), P2(llegada 1, ráfaga 2), P3(llegada 2, ráfaga 4) y P4(llegada 3, ráfaga 1) con SJF
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–5], P4[5–6], P2[6–8], P3[8–12]
ENTONCES el tiempo de espera medio es 3.25
ENTONCES el tiempo de retorno medio es 6.25

DADO los procesos P1(llegada 0, ráfaga 2), P2(llegada 5, ráfaga 2), P3(llegada 6, ráfaga 3) y P4(llegada 12, ráfaga 1) con SJF
CUANDO se ejecuta la simulación
ENTONCES la CPU está inactiva en los intervalos [2–5] y [10–12]
ENTONCES el diagrama de Gantt es P1[0–2], Inactivo[2–5], P2[5–7], P3[7–10], Inactivo[10–12], P4[12–13]

DADO los procesos P1(llegada 0, ráfaga 4), P2(llegada 0, ráfaga 2) y P3(llegada 0, ráfaga 3) con SJF
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P2[0–2], P3[2–5], P1[5–9]
ENTONCES el tiempo de espera medio es 2.33
ENTONCES el tiempo de retorno medio es 5.33

## § Simular — LJF (no expropiativo)

DADO los procesos P1(llegada 0, ráfaga 2), P2(llegada 0, ráfaga 4) y P3(llegada 0, ráfaga 3) con LJF
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P2[0–4], P3[4–7], P1[7–9]
ENTONCES el tiempo de espera medio es 3.67
ENTONCES el tiempo de retorno medio es 6.67

DADO los procesos P1(llegada 0, ráfaga 2), P2(llegada 0, ráfaga 3) y P3(llegada 6, ráfaga 3) con LJF
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P2[0–3], P1[3–5], Inactivo[5–6], P3[6–9]
ENTONCES el tiempo de espera medio es 1
ENTONCES el tiempo de retorno medio es 3.67

## § Simular — Prioridad (no expropiativa)

DADO los procesos P1(llegada 0, ráfaga 3, prioridad 3), P2(llegada 1, ráfaga 2, prioridad 2) y P3(llegada 2, ráfaga 2, prioridad 2) con Prioridad no expropiativa
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–3], P2[3–5], P3[5–7]
ENTONCES el tiempo de espera medio es 1.67
ENTONCES el tiempo de retorno medio es 4.00

DADO los procesos P1(llegada 0, ráfaga 3, prioridad 3), P2(llegada 1, ráfaga 2, prioridad 1) y P3(llegada 2, ráfaga 4, prioridad 2) con Prioridad no expropiativa
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–3], P2[3–5], P3[5–9]
ENTONCES el tiempo de espera medio es 1.67
ENTONCES el tiempo de retorno medio es 4.67

DADO los procesos P1(llegada 0, ráfaga 2, prioridad 1), P2(llegada 4, ráfaga 2, prioridad 3) y P3(llegada 5, ráfaga 2, prioridad 2) con Prioridad no expropiativa
CUANDO se ejecuta la simulación
ENTONCES la CPU está inactiva en el intervalo [2–4]
ENTONCES el diagrama de Gantt es P1[0–2], Inactivo[2–4], P2[4–6], P3[6–8]

DADO los procesos P1(llegada 0, ráfaga 4, prioridad 4), P2(llegada 0, ráfaga 3, prioridad 2) y P3(llegada 0, ráfaga 2, prioridad 1) con Prioridad no expropiativa
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P3[0–2], P2[2–5], P1[5–9]
ENTONCES el tiempo de espera medio es 2.33
ENTONCES el tiempo de retorno medio es 5.33

DADO un proceso P1(llegada 0, ráfaga 2) sin campo priority con Prioridad no expropiativa
CUANDO se ejecuta la simulación
ENTONCES el proceso se trata con la prioridad más baja (como si priority fuera Infinity)
ENTONCES la simulación no lanza error

## § Simular — Prioridad (expropiativa)

DADO los procesos P1(llegada 0, ráfaga 4, prioridad 2), P2(llegada 1, ráfaga 2, prioridad 2) y P3(llegada 2, ráfaga 2, prioridad 1) con Prioridad expropiativa
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–2], P3[2–4], P1[4–6], P2[6–8]
ENTONCES P3 finaliza en el tick 4, P1 en el tick 6 y P2 en el tick 8
ENTONCES el tiempo de espera medio es 2.33
ENTONCES el tiempo de retorno medio es 5.00

DADO los procesos P1(llegada 0, ráfaga 5, prioridad 3), P2(llegada 1, ráfaga 3, prioridad 2) y P3(llegada 2, ráfaga 2, prioridad 1) con Prioridad expropiativa
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–1], P2[1–2], P3[2–4], P2[4–6], P1[6–10]
ENTONCES el tiempo de espera medio es 2.33
ENTONCES el tiempo de retorno medio es 5.67

DADO los procesos P1(llegada 0, ráfaga 2, prioridad 2), P2(llegada 4, ráfaga 4, prioridad 3) y P3(llegada 5, ráfaga 2, prioridad 1) con Prioridad expropiativa
CUANDO se ejecuta la simulación
ENTONCES la CPU está inactiva en el intervalo [2–4]
ENTONCES el diagrama de Gantt es P1[0–2], Inactivo[2–4], P2[4–5], P3[5–7], P2[7–10]

DADO los procesos P1(llegada 0, ráfaga 3, prioridad 1), P2(llegada 1, ráfaga 2, prioridad 2) y P3(llegada 2, ráfaga 2, prioridad 3) con Prioridad expropiativa
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–3], P2[3–5], P3[5–7]
ENTONCES el tiempo de espera medio es 1.67
ENTONCES el tiempo de retorno medio es 4.00

DADO un proceso P1(llegada 0, ráfaga 2) sin campo priority con Prioridad expropiativa
CUANDO se ejecuta la simulación
ENTONCES el proceso se trata con la prioridad más baja (como si priority fuera Infinity)
ENTONCES la simulación no lanza error


## § Simular — Round Robin Virtual (expropiativa)

DADO los procesos P1(llegada 0, ráfaga 6, io:[{io_entry:2, io_time:3}]),
  P2(llegada 0, ráfaga 4, io:[{io_entry:1, io_time:4}]),
  P3(llegada 0, ráfaga 3) con Round Robin Virtual y quantum 4
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–2], P2[2–3], P3[3–5], P1[5–7], P3[7–8], P1[8–9], P2[9–12], P1[12-13]
ENTONCES P1 expropia a P3 en t=5 al volver de E/S (io-return)
ENTONCES P2 espera en la cola del dispositivo de t=3 a t=5 (contención)


DADO que un proceso se bloquea para E/S antes de agotar su quantum (sobrante > 0)
CUANDO el proceso vuelve de E/S
ENTONCES entra en la cola auxiliar con un sobrante igual a `quantum − ticks_ejecutados_en_ese_turno`

DADO que un proceso se bloquea para E/S exactamente cuando agota su quantum (sobrante = 0)
CUANDO el proceso vuelve de E/S
ENTONCES entra en la cola principal, no en la auxiliar

DADO que la cola auxiliar tiene al menos un proceso
CUANDO el motor elige quién ocupa la CPU
ENTONCES siempre se elige la cabeza de la cola auxiliar antes que cualquier proceso de la cola principal

DADO que se elige un proceso desde la cola auxiliar
CUANDO ocupa la CPU
ENTONCES su turno dura como máximo su sobrante; si no completa, pasa a la cola principal

DADO que Round Robin Virtual está activo con `quantum = 4` y hay procesos con y sin E/S
CUANDO el proceso intensivo en E/S vuelve de la cola auxiliar
ENTONCES completa antes que si se hubiera usado Round Robin clásico con el mismo quantum

> Nota (fixture verificado): `P1` {burst 4, io_entry 2, io_time 3}, `P2` {burst 4}, `P3` {burst 4}, todos `arrival 0`, `quantum 4`. Resultado VRR: `P1` completa en t=8; con RR clásico (sin E/S) completaría en t=12. Intervalos VRR: (P1,0,2), (P2,2,6), (P1,6,8), (P3,8,12).

DADO que Round Robin Virtual está activo y un proceso vuelve de E/S mientras otro ejecuta desde la cola principal
CUANDO el retorno de E/S entra en la cola auxiliar
ENTONCES el proceso en CPU es expropiado inmediatamente y devuelto a la cola principal; el recién llegado a la cola auxiliar toma la CPU en ese mismo tick


## § Simular — MLFQ (expropiativa)

DADO los procesos P1(llegada 0, ráfaga 8), P2(llegada 0, ráfaga 8) con MLFQ y quanta [2, 10] (nivel 0: RR q=2, nivel 1: RR q=10, nivel 2: FCFS), sin boostInterval
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–2], P2[2–4], P1[4–10], P2[10–16]
ENTONCES P1 completa en t=10, P2 en t=16
ENTONCES el tiempo de espera medio es 4.00

DADO los mismos procesos con MLFQ, quanta [2, 10] y boostInterval 6
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–2], P2[2–4], P1[4–8], P2[8–10], P1[10–12], P2[12–16]
ENTONCES P1 completa en t=12 (el boost le quitó la ventaja de nivel 1)

DADO que MLFQ está configurado
CUANDO se observan los niveles
ENTONCES hay exactamente 3 niveles fijos: nivel 0 (RR, quanta[0]), nivel 1 (RR, quanta[1]) y nivel 2 (FCFS, sin quantum)

DADO que un proceso llega por primera vez
CUANDO el motor lo inserta en las colas de MLFQ
ENTONCES entra en el nivel 0 (`levels[0]`)

DADO que un proceso en el nivel 0 agota el quantum sin completar
CUANDO el motor aplica la degradación
ENTONCES el proceso pasa al nivel 1

DADO que un proceso en el nivel 1 agota el quantum sin completar
CUANDO el motor aplica la degradación
ENTONCES el proceso pasa al nivel 2 (FCFS)

DADO que un proceso en el nivel 2 está ejecutando
CUANDO se evalúa si expira su quantum
ENTONCES no expira (`quantumFor` devuelve `0`); el nivel 2 es **run-to-completion**: una vez el proceso toma la CPU, solo la abandona al completar su ráfaga

DADO que un proceso ya está en el nivel 2
CUANDO el motor evalúa si degradar más
ENTONCES permanece en el nivel 2; no se degrada más allá

DADO que un proceso A está ejecutando en cualquier nivel y llega un proceso B (que entra al nivel 0)
CUANDO el motor procesa esa llegada
ENTONCES A NO es expropiado: conserva la CPU hasta agotar su quantum (niveles 0 y 1) o completar su ráfaga (nivel 2). B espera en la cola del nivel 0. MLFQ solo expropia por agotamiento de quantum, nunca por llegada

DADO que el proceso A en CPU (nivel 0 o 1) agota su quantum y B esperaba en el nivel 0
CUANDO el motor libera la CPU
ENTONCES A se degrada al siguiente nivel y, como la CPU queda libre, `select` elige a B del nivel 0 (el nivel no vacío de menor índice)

DADO que MLFQ tiene `boostInterval` configurado y se alcanza ese tick mientras un proceso del **nivel 2** está en CPU
CUANDO el motor aplica el *priority boost*
ENTONCES el proceso del nivel 2 en CPU NO se ve afectado (conserva la CPU y su nivel); el resto de procesos suben al nivel 0

DADO que MLFQ tiene `boostInterval` configurado y se alcanza ese tick mientras un proceso del nivel 0 o 1 está en CPU
CUANDO el motor aplica el *priority boost*
ENTONCES todos esos procesos, incluido el que está en CPU en ese instante, suben al nivel 0 y se reevalúa quién debe ejecutar

DADO que el *priority boost* interrumpe al proceso en CPU
CUANDO ese proceso vuelve al nivel 0 junto al resto
ENTONCES el orden de reencolado entre procesos simultáneos se resuelve por menor `id`

> Nota (fixture verificado): `quanta [2, 10]`, `boostInterval 6`, `P1` {burst 8},
> `P2` {burst 8}, ambos `arrival 0`. 3 niveles: nivel 0 (RR q=2), nivel 1 (RR q=10),
> nivel 2 (FCFS). Sin boost: P1 completa t=10, P2 t=16 (ninguno alcanza nivel 2 porque
> completan dentro del quantum de nivel 1). Con boost en t=6: P1 completa t=12, P2 t=16.

DADO que MLFQ no tiene `boostInterval` configurado
CUANDO los procesos de CPU-bound se degradan al nivel 2 (FCFS)
ENTONCES pueden sufrir inanición; esto se acepta como limitación cuando no hay boost

DADO que `quanta` no tiene exactamente 2 enteros positivos
CUANDO el motor valida los parámetros
ENTONCES rechaza la configuración con un error claro


## § Contrato de algoritmo (extensibilidad)

DADO un algoritmo nuevo que implementa la interfaz `IAlgorithm` y se registra por su nombre
CUANDO el simulador lo ejecuta sobre un conjunto de procesos
ENTONCES produce un resultado (intervalos, historial y métricas) sin que se modifique el motor

DADO un algoritmo cuyo `requires` no incluye prioridad
CUANDO el componente muestra el escenario
ENTONCES no se muestra la prioridad de los procesos

DADO cualquier algoritmo de planificación registrado
CUANDO se le pide seleccionar un proceso pasándole una cola de listos vacía
ENTONCES lanza un error de seguridad indicando que la cola está vacía

DADO un algoritmo con cola interna (Round Robin o MLFQ)
CUANDO se le pide seleccionar y su cola interna aún no contiene ningún proceso de la lista de listos (p. ej. antes de recibir eventos `arrival`)
ENTONCES recurre al primer proceso de la lista, que el motor ya entrega ordenada por el desempate global (`arrival_time`, luego `id`)

## § Verificación de contrato de algoritmo (Extensibilidad)

DADO que se implementa una clase de prueba que cumple el contrato `IAlgorithm` únicamente con el método `select()` y la propiedad `triggers`
CUANDO se registra bajo un identificador (`name`) y se ejecuta la simulación
ENTONCES el motor la procesa correctamente sin requerir modificación alguna en el código interno del motor o del componente

DADO que un algoritmo de prueba implementa los métodos opcionales `onEvent()` y `quantumFor()` además de `select()`
CUANDO se registra y se simula un escenario
ENTONCES el motor invoca `onEvent` en cada transición de estado y respeta el límite de tiempo (slice) devuelto por `quantumFor`, garantizando que el algoritmo no acceda al estado interno del motor

DADO que un algoritmo implementa `onEvent()` y retorna una cadena de texto (string) con el motivo descriptivo de un evento
CUANDO el motor ensambla el mensaje del tick correspondiente
ENTONCES el registro final incluye el texto del motivo devuelto por el algoritmo, enriqueciendo la narrativa

DADO que un algoritmo implementa `onEvent()` y retorna `null` para un evento específico
CUANDO el motor ensambla el mensaje del tick correspondiente
ENTONCES el registro final utiliza la frase genérica predeterminada del motor para ese tipo de evento

DADO que el sistema contiene 9 algoritmos oficiales soportados
CUANDO se consulta el registro global de la aplicación
ENTONCES la totalidad de los identificadores son recuperables exitosamente: `fcfs`, `sjf`, `ljf`, `priority-np`, `srtf`, `priority-p`, `round-robin`, `virtual-round-robin` y `mlfq`


## § Escenario de ejemplo por defecto

DADO que el usuario abre la página de un algoritmo
CUANDO la página termina de cargar
ENTONCES se muestra el escenario de ejemplo precargado y ya simulable

DADO que el usuario recarga la página dentro de la misma pestaña tras haber editado el escenario
CUANDO vuelve a cargar
ENTONCES se restaura el escenario editado desde `sessionStorage` (persiste dentro de la pestaña)

DADO que el usuario cierra la pestaña y abre una nueva con la misma página
CUANDO la página carga
ENTONCES se muestra el escenario de ejemplo por defecto (`sessionStorage` se perdió al cerrar)

## § Persistencia por sesión

DADO que el usuario ha editado un escenario
CUANDO recarga la página
ENTONCES el escenario se restaura desde `sessionStorage` tal como estaba antes de la recarga

DADO que el usuario ha editado un escenario y cierra la pestaña
CUANDO vuelve a abrir la misma página en una pestaña nueva
ENTONCES el escenario editado se ha perdido y la página carga el ejemplo por defecto (`sessionStorage` se borra al cerrar la pestaña)

DADO que el usuario edita el escenario de la página `/round-robin`
CUANDO navega a la página `/mlfq` sin cerrar el navegador
ENTONCES el escenario de `/mlfq` no se ve afectado; cada página lee y escribe su propia clave de `sessionStorage`

DADO que el usuario edita el escenario de la página `/fcfs` y luego vuelve a `/round-robin`
CUANDO la página `/round-robin` se renderiza de nuevo
ENTONCES muestra el escenario que tenía guardado bajo su propia clave, no el de `/fcfs`

DADO que se guardan escenarios para varias páginas distintas
CUANDO se inspecciona `sessionStorage` del navegador
ENTONCES existe una clave distinta por algoritmo (p. ej. `scheduler-scenario:fcfs`, `scheduler-scenario:round-robin`), nunca una clave única compartida

DADO que el usuario pulsa la acción de reset
CUANDO se ejecuta el reset
ENTONCES el escenario vuelve al ejemplo por defecto de esa página de demo y `sessionStorage` se limpia para esa clave

DADO que el resultado de la simulación se ha calculado en el cliente
CUANDO el escenario se guarda en `sessionStorage`
ENTONCES solo se persiste el `Scenario` (procesos, algoritmo, parámetros, rama what-if si la hay); el resultado nunca se persiste

## § Render — `SimulationProvider`

DADO una configuración de escenario válida
CUANDO el `SimulationProvider` se monta
ENTONCES invoca al motor, guarda el escenario en `sessionStorage` y provee el estado, el historial y el reproductor (`Player`) a sus hijos

DADO un hook `useSimulation()` usado fuera de un `SimulationProvider`
CUANDO el componente intenta renderizar
ENTONCES lanza un error descriptivo indicando que falta el proveedor

DADO que se pasa una lista de procesos vacía al proveedor
CUANDO inicializa el contexto
ENTONCES el estado se genera correctamente (conjunto vacío) sin lanzar excepciones y se proporciona al árbol de componentes

DADO que se pasa una configuración inválida (ej. burst_time negativo o 0)
CUANDO el proveedor intenta simular
ENTONCES captura el error internamente y lo expone a través del contexto (`error`), evitando que la aplicación colapse

DADO un `SimulationProvider` con un nombre de algoritmo que no existe en el registro
CUANDO se monta el componente
ENTONCES el contexto expone un error descriptivo y no lanza excepción no capturada

DADO un `SimulationProvider`
CUANDO se monta en el DOM
ENTONCES no renderiza absolutamente ningún elemento visual propio ni layout, limitándose a renderizar estrictamente los `children` que recibe envueltos en el contexto

DADO que existe una rama what-if activa y se editan los procesos del escenario (`updateProcesses`)
CUANDO el proveedor aplica la edición
ENTONCES la rama what-if se **rederiva con los procesos nuevos** conservando su algoritmo y parámetros alternativos (la rama comparte siempre los procesos con el escenario actual); si la edición la invalida (lista vacía o error), la rama se descarta

## § Render — SimulationApp (Orquestador Visual)

DADO que se proporciona una configuración inicial al componente principal
CUANDO el `SimulationApp` se monta
ENTONCES envuelve la estructura en un `SimulationProvider`
ENTONCES renderiza el layout principal montando los subcomponentes visuales (`AlgorithmParamsForm`, `ProcessTable`, `GanttChart`, `PlaybackControls`, `MetricsTable`, `ProcessForm`)

DADO que el componente permite inyección de clases de diseño
CUANDO se le pasa una directiva de layout (ej. className="modo-panel")
ENTONCES el contenedor principal aplica esa clase CSS para adaptar la cuadrícula de los componentes

## § Página de algoritmo y campos declarados

DADO la página del algoritmo FCFS
CUANDO se muestra el escenario
ENTONCES no se muestra la prioridad de los procesos

DADO la página del algoritmo Prioridad (no expropiativa)
CUANDO se muestra el escenario
ENTONCES se muestra la prioridad de cada proceso

DADO la página del algoritmo Round Robin
CUANDO se muestra la configuración
ENTONCES se muestra el parámetro "quantum" y es un entero mayor que 0

DADO la página del algoritmo Round Robin Virtual
CUANDO se muestra la configuración
ENTONCES se muestra el AlgorithmParamsForm con el parámetro "quantum" visible de inicio
ENTONCES aparecen las columnas de E/S (io_entry, io_time) en el ProcessForm y la columna `io_exit` (derivada) en la `ProcessTable`

DADO la página del algoritmo MLFQ
CUANDO se muestra la configuración
ENTONCES se muestra el AlgorithmParamsForm con "quanta" (lista) y "boostInterval" (opcional) visibles de inicio
ENTONCES no aparecen las columnas de E/S

## § Render — `ProcessTable`

DADO que el algoritmo activo no modela E/S (cualquiera excepto Round Robin Virtual)
CUANDO se renderiza la `ProcessTable`
ENTONCES las columnas de E/S (entrada, tiempo, salida) no aparecen

DADO que el algoritmo activo es Round Robin Virtual
CUANDO se renderiza la `ProcessTable` y algún proceso tiene `io` declarado
ENTONCES aparecen las columnas de entrada de E/S, tiempo de E/S y salida de E/S (derivada)

DADO que el algoritmo activo es Round Robin Virtual y un proceso tiene varias operaciones de E/S
CUANDO se renderiza la `ProcessTable`
ENTONCES el proceso ocupa una sub-fila por operación (con sus valores entrada, tiempo, salida) y las celdas del proceso (ID, Llegada, Ráfaga y Prioridad si aplica) se **combinan** con `rowSpan` abarcando todas sus sub-filas

DADO que el algoritmo activo es Round Robin Virtual y un proceso no tiene operaciones de E/S
CUANDO se renderiza la `ProcessTable`
ENTONCES el proceso ocupa una sola fila con «—» en las columnas de E/S

## § Render — `GanttChart`

DADO que el historial está completamente calculado
CUANDO se renderiza el `GanttChart` por primera vez
ENTONCES la tabla tiene exactamente tantas filas como procesos y tantas columnas como ticks en el historial; su tamaño no cambia durante la reproducción

DADO que se renderiza el `GanttChart` con props opcionales (`history`, `processes`, `currentTick`, `requires`, `message`, `testId`)
CUANDO alguna prop está presente
ENTONCES esa prop sobrescribe el valor que el componente tomaría del contexto (`useSimulation()`), lo que permite reutilizarlo para pintar la rama what-if; sin props, el componente lee todo del contexto (comportamiento por defecto)

DADO que el reproductor está en el tick `T`
CUANDO el `GanttChart` está visible
ENTONCES las celdas de los ticks 0 a T muestran su color/trama según el estado; las celdas de los ticks posteriores a T están vacías (sin color)

DADO que el reproductor avanza un tick
CUANDO la columna `T+1` pasa a ser visible
ENTONCES solo cambia el color de esas celdas; el tamaño de la tabla no cambia

DADO que un proceso está en CPU en el tick `T`
CUANDO se muestra la celda correspondiente
ENTONCES aparece con el color sólido asignado a ese proceso y la etiqueta «CPU» dentro (texto blanco, con animación de pulso)

DADO que un proceso está en la cola de listos en el tick `T`
CUANDO se muestra la celda correspondiente
ENTONCES aparece con el color del proceso pero en tono claro (opacidad reducida)

DADO que el algoritmo emite niveles de cola (`levels`: MLFQ, o VRR) y un proceso ocupa la CPU en el tick `T`
CUANDO se muestra la celda correspondiente
ENTONCES la etiqueta de CPU integra el número de cola en formato «CPU{n}» (p. ej. «CPU0», «CPU1»)

DADO que el algoritmo emite niveles de cola y un proceso está en espera (cola de listos) en el tick `T`
CUANDO se muestra la celda correspondiente
ENTONCES muestra un pequeño badge con su número de cola en formato «L{n}» (p. ej. «L0»)

DADO que el algoritmo es Round Robin Virtual (dos colas: 0 = auxiliar, vuelve de E/S con sobrante; 1 = principal, RR con quantum)
CUANDO un proceso ocupa la CPU en el tick `T`
ENTONCES su etiqueta de CPU muestra «CPU0» si fue despachado desde la cola auxiliar o «CPU1» si lo fue desde la principal

DADO que el algoritmo es Round Robin Virtual y un proceso está en servicio en el dispositivo (`inIO`) en el tick `T`
CUANDO se muestra la celda correspondiente
ENTONCES la celda aparece **sin fondo** y solo muestra el texto «E/S», cuyo color procede de un token de tema (`--scheduler-gantt-io-text`: negro en tema claro, blanco en tema oscuro)

DADO que el algoritmo es Round Robin Virtual y un proceso está esperando el dispositivo (`waitingIO`) en el tick `T`
CUANDO se muestra la celda correspondiente
ENTONCES la celda aparece **sin fondo** y solo muestra el texto «L(E/S)» (mismo token de tema), de modo que se distingan visualmente "esperando dispositivo" («L(E/S)») y "en servicio" («E/S»)

DADO que la CPU está inactiva en el tick `T`
CUANDO se muestra la celda de la fila correspondiente
ENTONCES aparece con fondo de superficie elevada distinguible

DADO que un proceso aún no ha llegado o ya ha completado en el tick `T`
CUANDO se muestra la celda correspondiente
ENTONCES aparece vacía (sin color)

DADO que aún no hay un resultado calculado (`result` es `null`) ni tick actual
CUANDO se renderiza el `GanttChart`
ENTONCES renderiza el contenedor con el área de mensaje vacía y sin celdas, sin lanzar error

DADO que se renderiza la leyenda del `GanttChart`
CUANDO el algoritmo activo es cualquiera
ENTONCES aparece el título «Leyenda» antes de la lista, y siempre las entradas «Ejecución (CPU)», «En Espera (Listo)» e «Inactivo (Vacío)»; los ítems comparten un ancho mínimo común para alinearse al envolver en varias filas

DADO que el algoritmo activo es Round Robin Virtual y se renderiza la leyenda
CUANDO se muestran las entradas de E/S
ENTONCES sus marcadores son los textos «E/S» y «L(E/S)» dentro de una caja con borde (no un cuadro de color), de la misma altura que los swatches de color

DADO que el algoritmo activo no es Round Robin Virtual
CUANDO se renderiza la leyenda del `GanttChart`
ENTONCES no aparecen las entradas «Bloqueado (E/S)» ni «Cola de E/S»

DADO que el algoritmo activo es Round Robin Virtual (`requires.io`)
CUANDO se renderiza la leyenda del `GanttChart`
ENTONCES aparecen además las entradas «Bloqueado (E/S)» y «Cola de E/S»

## § Reproducción automática

DADO una simulación ya calculada en el tick 0
CUANDO el usuario pulsa "reproducir" hacia delante
ENTONCES el tick mostrado avanza automáticamente hasta el último y se detiene


## § Render — `PlaybackControls`

DADO un SimulationProvider con una simulación calculada
CUANDO PlaybackControls se renderiza
ENTONCES muestra los botones: ir al inicio (⏮), paso atrás (◀), reproducir/pausar (▶/⏸), paso adelante (▶|), ir al final (⏭)
ENTONCES muestra la barra de desplazamiento y el indicador de tick actual

DADO PlaybackControls en el tick 0
CUANDO se observan los botones
ENTONCES el botón paso atrás y el botón ir al inicio están deshabilitados (disabled)

DADO PlaybackControls en el último tick
CUANDO se observan los botones
ENTONCES el botón paso adelante y el botón ir al final están deshabilitados (disabled)

DADO PlaybackControls en un tick intermedio
CUANDO se observan los botones
ENTONCES todos los botones están habilitados

DADO un SimulationProvider sin procesos (resultado nulo)
CUANDO PlaybackControls se renderiza
ENTONCES muestra los controles con tick 0 / 0 y todos los botones de avance deshabilitados

DADO PlaybackControls reproduciendo automáticamente
CUANDO la reproducción llega al último tick
ENTONCES la reproducción se detiene automáticamente (playing pasa a false)

## § Iconos SVG

DADO que el componente `PlaybackControls` requiere iconografía para sus acciones
CUANDO se renderizan los botones de control
ENTONCES los botones contienen elementos `<svg>` nativos correspondientes a las acciones
ENTONCES no se utiliza ningún carácter Unicode o emoji como sustituto visual de los iconos

DADO un icono SVG dentro de los controles de reproducción
CUANDO se inspecciona su estructura en el DOM
ENTONCES el elemento `<svg>` contiene el atributo `aria-hidden="true"` para que los lectores de pantalla lo ignoren, delegando la descripción al botón contenedor

## § Tamaño consistente de botones

DADO el panel de controles de reproducción
CUANDO se renderizan los botones de navegación y reproducción
ENTONCES los elementos implementan la propiedad de CSS `font-size` vinculada al token `--scheduler-icon-size-md` para garantizar uniformidad visual

DADO cualquier botón de control dentro del `PlaybackControls`
CUANDO es accesible mediante tecnologías de asistencia
ENTONCES cuenta con un atributo `aria-label` estricto y descriptivo (ej. "Ir al inicio", "Paso adelante")

## § Render — `MetricsTable`

DADO que el reproductor no está en el último tick
CUANDO el `GanttChart` y el reproductor están visibles
ENTONCES la `MetricsTable` está oculta

DADO que el reproductor alcanza el último tick
CUANDO la `MetricsTable` se hace visible
ENTONCES muestra las métricas por proceso y las agregadas coherentes con el historial completo

DADO que la `MetricsTable` es visible (último tick)
CUANDO se evalúa su estructura
ENTONCES **todas** las métricas (la tabla por proceso y las métricas agregadas) están agrupadas dentro de un **único desplegable** (`<details>`) con un `summary` "Métricas", y el desplegable está **inicialmente abierto** (atributo `open`)

DADO que la `MetricsTable` está visible con su desplegable abierto
CUANDO el usuario lo cierra (clic en el `summary`)
ENTONCES se ocultan a la vez la tabla por proceso y las métricas agregadas; al volver a abrirlo reaparecen ambas


## § ProcessForm — panel desplegable de edición de procesos

DADO que el `ProcessForm` no ha sido abierto
CUANDO la demo está visible
ENTONCES el panel está cerrado y los procesos solo se ven en la `ProcessTable` (solo lectura)

DADO que el usuario abre el `ProcessForm`
CUANDO el panel se despliega
ENTONCES muestra todos los procesos del escenario actual con sus valores en campos editables

DADO que el usuario modifica un campo válido de un proceso (p. ej. cambia `burst_time`)
CUANDO el campo pierde el foco o cambia su valor
ENTONCES la simulación rederiva al instante con el valor nuevo y el Gantt se actualiza

DADO que el usuario modifica un campo con un valor inválido (p. ej. `burst_time = 0`)
CUANDO el campo pierde el foco
ENTONCES se muestra el error en el campo y la simulación no rederiva hasta corregirlo

DADO que el usuario introduce un `id` que ya existe en otro proceso
CUANDO el campo pierde el foco
ENTONCES se muestra error de `id` duplicado y la simulación no rederiva

DADO que el usuario añade un proceso nuevo desde el control de añadir
CUANDO el proceso se añade con valores por defecto
ENTONCES aparece en el panel y la simulación rederiva al instante con ese proceso incluido

DADO que el usuario elimina un proceso desde su control de borrado
CUANDO la eliminación ocurre
ENTONCES el proceso desaparece del panel y la simulación rederiva al instante

DADO que el usuario elimina todos los procesos del escenario
CUANDO no queda ninguno
ENTONCES la simulación produce estado vacío sin error y el panel muestra solo el control de añadir

DADO que el reproductor está en el tick `T` y el usuario añade un proceso con `arrival_time ≥ T`
CUANDO la validación pasa
ENTONCES la simulación rederiva desde el tick `T` hacia delante con el nuevo proceso

DADO que el reproductor está en el tick `T` y el usuario intenta añadir un proceso con `arrival_time < T`
CUANDO el campo pierde el foco
ENTONCES se muestra error y la simulación no rederiva

DADO que el algoritmo activo no requiere `priority`
CUANDO el `ProcessForm` está abierto
ENTONCES el campo `priority` no aparece en ningún proceso

DADO que el algoritmo activo no es Round Robin Virtual
CUANDO el `ProcessForm` está abierto
ENTONCES los campos `io_entry` e `io_time` no aparecen


## § ProcessForm — edición de operaciones de E/S

DADO que el algoritmo activo requiere E/S (ej. Round Robin Virtual)
CUANDO se expande un proceso en el formulario
ENTONCES el botón «Añadir E/S» aparece en la **línea principal** del proceso (a la misma altura que sus campos y el botón «Eliminar»), y las operaciones de E/S se listan **debajo**, una por línea, etiquetadas «E/S 1», «E/S 2», … cada una editable (`io_entry` e `io_time`)

DADO la sublista de operaciones de E/S de un proceso
CUANDO el usuario añade o elimina una operación
ENTONCES la simulación se rederiva instantáneamente

DADO que un proceso tiene operaciones de E/S
CUANDO el usuario edita un `io_entry` haciéndolo mayor o igual al `burst_time`
ENTONCES el campo marca error indicando que debe ser menor a la ráfaga y la simulación no se rederiva (validación en cascada)

DADO la sublista de operaciones de E/S de un proceso
CUANDO el usuario introduce valores de `io_entry` que no son estrictamente crecientes
ENTONCES el campo infractor marca error y la simulación no se rederiva

DADO la sublista de operaciones de E/S de un proceso
CUANDO el usuario introduce un valor de `io_entry` ≤ 0 o un valor de `io_time` ≤ 0
ENTONCES el campo marca error de validación y la simulación no se rederiva

DADO un proceso que tiene una única operación de E/S registrada
CUANDO el usuario elimina esa última operación
ENTONCES la sublista queda vacía, el proceso se comporta estrictamente como un proceso "solo CPU" y la simulación se rederiva instantáneamente

## § WhatIfControls — rama what-if

> **Nota (v-02):** la implementación actual del *what-if* es una **comparación de
> escenario alternativo**: al crear la rama se rederiva el escenario completo (`run`)
> con un algoritmo y/o parámetros distintos, y se compara con el escenario actual en
> **tres vistas desplegables**: diagrama de Gantt, métricas por proceso y métricas
> agregadas. No conserva el historial hasta `T` mediante `runFrom(state)` (ese enfoque
> queda como trabajo futuro; ver `DECISIONS.md`).

DADO que el reproductor está en cualquier tick (incluidos el tick 0 y el último al finalizar el simulador)
CUANDO se evalúa el componente `WhatIfControls`
ENTONCES el componente es visible (no se oculta en ningún tick)

DADO que el reproductor está en un tick cualquiera y no hay rama activa
CUANDO se evalúa el componente `WhatIfControls`
ENTONCES se muestra un formulario con un selector de algoritmo (los registrados en el `registry`) y los campos de parámetros aplicables al algoritmo elegido (`quantum`, `quanta`, `boostInterval`)

DADO que el usuario elige un algoritmo de colas multinivel (p. ej. `mlfq`, `requires.levels = true`)
CUANDO se evalúa el formulario de variación
ENTONCES se muestran los campos de quantum por nivel (`quantum nivel 0`, `quantum nivel 1`) y el campo opcional `boost interval`

DADO que el usuario elige un algoritmo o parámetros alternativos y pulsa "Comparar" con valores válidos
CUANDO se acciona el control
ENTONCES se invoca `createWhatIf({ algorithm, params })` y, con la rama creada, la UI muestra **tres secciones desplegables** comparando el escenario actual frente a la rama: diagrama de Gantt, métricas por proceso y métricas agregadas

DADO que existe una rama what-if activa
CUANDO se evalúa la sección "Diagrama de Gantt — rama «¿y si?»"
ENTONCES se renderiza **solo el diagrama de Gantt de la rama** (el del escenario actual NO se repite aquí: ya se muestra arriba en el simulador principal), acompañado de su **propio `PlaybackControls` independiente** (con sus `data-testid` propios, p. ej. `whatif-playback`), separado del reproductor del simulador principal

DADO que el reproductor propio de la rama está en un tick `T`
CUANDO se acciona (paso adelante/atrás, ir al inicio/final o arrastrar la barra)
ENTONCES revela el diagrama de la rama hasta `T`, sin afectar al reproductor del simulador principal ni a su diagrama; con `T` intermedio, las celdas de la rama con tick > `T` aún no están reveladas

DADO que la rama what-if dura más o menos ticks que el escenario actual
CUANDO se reproduce con el control propio de la rama
ENTONCES su rango es la **longitud de la propia rama** (no la del escenario actual), de modo que la rama **siempre** se puede recorrer completa

DADO que existe una rama what-if activa
CUANDO se evalúa la comparación en cualquier tick
ENTONCES las tablas de métricas de comparación (por proceso y agregadas) se muestran siempre, sin depender del tick actual

DADO que existe una rama what-if activa
CUANDO se evalúa la sección "Métricas por proceso — comparación"
ENTONCES la tabla muestra una fila por proceso con su espera y turnaround en el escenario actual, en la rama y su diferencia (Δ); por ejemplo, comparar `fcfs` con `sjf` sobre A(ráfaga 4)/B(ráfaga 2) da en A `Δespera = +2`, `Δturnaround = +2` y en B `Δespera = −4`, `Δturnaround = −4`

DADO que existe una rama what-if activa
CUANDO se evalúa la sección "Métricas agregadas — comparación"
ENTONCES la tabla compara espera media, turnaround medio, utilización de CPU y throughput del escenario actual frente a la rama, con su diferencia (Δ)

DADO que existe una rama what-if activa (p. ej. escenario `fcfs` comparado con `sjf`)
CUANDO se evalúan las etiquetas de la comparación
ENTONCES el indicador de cabecera muestra "Comparar", la columna/etiqueta del escenario actual lleva el nombre del algoritmo activo (`fcfs`) y la de la rama el texto "Comparado con `sjf`"

DADO que el usuario introduce un parámetro inválido (p. ej. `quantum ≤ 0`, o un quantum de nivel `≤ 0` en `mlfq`)
CUANDO pulsa "Comparar"
ENTONCES no se crea ninguna rama y se muestra el mensaje de error de validación

DADO que existe una rama what-if activa
CUANDO el usuario hace clic en "Descartar rama"
ENTONCES se invoca `discardWhatIf()`, se elimina la rama (y su entrada en sessionStorage) y el componente vuelve a mostrar el formulario de variación

DADO que existe una rama what-if activa
CUANDO se evalúa el componente
ENTONCES no se muestra el formulario de variación (solo puede haber una rama a la vez)

## § Render — `AlgorithmParamsForm`

DADO que el algoritmo activo no declara parámetros configurables (`requires` sin `quantum` ni `levels`)
CUANDO se renderiza el `AlgorithmParamsForm`
ENTONCES el componente no renderiza nada (devuelve `null`)

DADO que el algoritmo activo declara `requires.quantum` sin `levels` (Round Robin / Round Robin Virtual)
CUANDO se renderiza el `AlgorithmParamsForm`
ENTONCES muestra un único campo «Quantum» (`input-quantum`) y no muestra los campos por nivel

DADO que el algoritmo activo declara `requires.levels` (MLFQ)
CUANDO se renderiza el `AlgorithmParamsForm`
ENTONCES muestra «Quantum nivel 0» (`input-quantum-0`), «Quantum nivel 1» (`input-quantum-1`) y «Boost interval» (`input-boost-interval`), y no muestra el campo de quantum único

DADO que el algoritmo es MLFQ y `params.quanta` trae valores
CUANDO se renderiza el formulario
ENTONCES los campos de nivel se precargan con esos valores; si `params` no trae `quanta`, se usan los valores por defecto `[2, 4]`

DADO que el formulario se acaba de renderizar sin que el usuario edite nada
CUANDO se observa el botón «Aplicar»
ENTONCES está deshabilitado, y se habilita en cuanto se edita cualquier campo

DADO que el usuario pulsa «Aplicar» con un valor inválido (`≤ 0`) en `quantum`, `quanta[0]`, `quanta[1]` o `boostInterval`
CUANDO se valida el draft
ENTONCES se muestra el mensaje de error correspondiente (`role="alert"`) y no se llama a `updateParams`

DADO que el usuario pulsa «Aplicar» con quanta válidos en MLFQ
CUANDO se valida el draft
ENTONCES `updateParams` recibe `quanta` como par `[q0, q1]`, y `boostInterval` solo si se ha indicado un valor válido

DADO que el algoritmo activo cambia (nuevo `algorithmName`)
CUANDO el `AlgorithmParamsForm` se vuelve a renderizar
ENTONCES descarta el draft anterior (recarga desde los `params` del nuevo algoritmo), limpia los errores y deshabilita «Aplicar»

DADO que el algoritmo activo tiene `paramSchema` (Round Robin, Round Robin Virtual o `mlfq`)
CUANDO se carga la página de demo por primera vez
ENTONCES el `AlgorithmParamsForm` aparece visible de inmediato, con los campos ya rellenos con los valores iniciales del escenario de ejemplo (sin que el usuario tenga que abrir nada), a diferencia de `ProcessForm`, que está cerrado por defecto

DADO que el algoritmo activo no tiene `paramSchema` (p. ej. FCFS, SJF, Prioridad)
CUANDO se renderiza la página de demo
ENTONCES el componente `AlgorithmParamsForm` no aparece

DADO que el usuario edita el campo de `quantum` en el formulario sin pulsar "Aplicar"
CUANDO el Gantt y las métricas están visibles
ENTONCES el resultado mostrado sigue siendo el del último valor aplicado; no se rederiva

DADO que el usuario pulsa "Aplicar" con un valor de `quantum ≤ 0`
CUANDO el motor valida con `validateParams`
ENTONCES se muestra el error de validación y el resultado visible no cambia

DADO que el usuario pulsa "Aplicar" con un valor de `quantum` válido
CUANDO el motor rederiva
ENTONCES el Gantt y las métricas se actualizan al resultado con el nuevo quantum y el estado "pendiente" se limpia

DADO que el usuario escribe `boostInterval` en el formulario de MLFQ y pulsa "Aplicar"
CUANDO el motor rederiva con el nuevo `boostInterval`
ENTONCES el resultado cambia respecto a la simulación sin boost (si las condiciones del escenario lo permiten)

DADO que el usuario deja el campo `boostInterval` vacío y pulsa "Aplicar"
CUANDO el motor valida
ENTONCES lo interpreta como "sin boost" (equivale a omitirlo), no como un error de validación

DADO que el usuario selecciona un algoritmo diferente en la demo
CUANDO se monta el `AlgorithmParamsForm` del nuevo algoritmo
ENTONCES el formulario muestra los campos del nuevo `paramSchema` y descarta cualquier valor pendiente del anterior

