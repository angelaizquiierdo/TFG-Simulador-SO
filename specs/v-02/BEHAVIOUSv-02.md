# # Acceptance Criteria — v02

##  Registro de algoritmos

DADO un algoritmo válido
CUANDO se registra en el sistema
ENTONCES se puede recuperar posteriormente por su nombre exacto

DADO que se registra un algoritmo con un nombre que ya existe
CUANDO se realiza el registro
ENTONCES el nuevo algoritmo sobrescribe al anterior

DADO que el sistema intenta recuperar un algoritmo no registrado
CUANDO el registro de algoritmos no está completamente vacío
ENTONCES se produce un error que lista los nombres de los algoritmos disponibles actualmente

DADO que el sistema intenta recuperar un algoritmo no registrado
CUANDO el registro de algoritmos está completamente vacío
ENTONCES se produce un error que indica explícitamente "(ninguno)" en la lista de algoritmos disponibles


DADO que se registra un algoritmo bajo un `name`
CUANDO se solicita ese mismo `name` al registro
ENTONCES se devuelve la instancia registrada sin error


DADO que se intenta registrar dos algoritmos con el mismo `name`
CUANDO el segundo intento de registro ocurre
ENTONCES se produce un error y el registro conserva solo la primera instancia

## Contrato de algoritmo (extensibilidad)

DADO un algoritmo nuevo que implementa la interfaz `IAlgorithm` y se registra por su nombre
CUANDO el simulador lo ejecuta sobre un conjunto de procesos
ENTONCES produce un resultado (intervalos, historial y métricas) sin que se modifique el motor

DADO un algoritmo cuyo `requires` no incluye prioridad
CUANDO el componente muestra el escenario
ENTONCES no se muestra la prioridad de los procesos

DADO cualquier algoritmo de planificación registrado
CUANDO se le pide seleccionar un proceso pasándole una cola de listos vacía
ENTONCES lanza un error de seguridad indicando que la cola está vacía

## Simulador independiente de la vista

DADO un script de Node sin ninguna librería de interfaz
CUANDO importa el simulador y ejecuta una simulación
ENTONCES obtiene el resultado (intervalos, historial y métricas) sin dependencias de presentación

## Estructura del resultado de simulación

DADO un conjunto que contiene al menos un proceso válido y cualquier algoritmo
CUANDO el motor principal completa la simulación
ENTONCES el resultado devuelto contiene una lista de intervalos de ejecución no vacía
ENTONCES el resultado devuelto contiene un historial temporal de eventos no vacío
ENTONCES el resultado devuelto contiene las métricas individuales y agregadas calculadas

## Página de algoritmo y campos declarados

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

## Algoritmos clásicos — solo CPU

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


## Validación de configuración

DADO que se configura un proceso con `burst_time ≤ 0`
CUANDO el motor intenta simular
ENTONCES se produce un error de configuración sin iniciar la simulación


DADO que se configura un proceso con `arrival_time < 0`
CUANDO el motor intenta simular
ENTONCES se produce un error de configuración sin iniciar la simulación


DADO que el algoritmo requiere `priority` y un proceso no la declara
CUANDO el motor intenta simular
ENTONCES se produce un error de configuración indicando el campo ausente


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


## Simular — FCFS

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

## Simular — SJF (no expropiativo)

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

## Simular — LJF (no expropiativo)

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

## Simular — SRTF (expropiativo)

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

## Simular — Round Robin

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

## Simular — Prioridad (no expropiativa)

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

## Simular — Prioridad (expropiativa)

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


## Simular — MLFQ (expropiativa)

DADO los procesos P1(llegada 0, ráfaga 8), P2(llegada 0, ráfaga 8) con MLFQ y quanta [2, 10], sin boostInterval
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–2], P2[2–4], P1[4–10], P2[10–16]
ENTONCES P1 completa en t=10, P2 en t=16
ENTONCES el tiempo de espera medio es 4.00


DADO los mismos procesos con MLFQ, quanta [2, 10] y boostInterval 6
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–2], P2[2–4], P1[4–6], P1[6–8],
  P2[8–10], P1[10–12], P2[12–16]
ENTONCES P1 completa en t=12 (el boost le quitó la ventaja de nivel 1)

## Simular — Round Robin Virtual (expropiativa)

DADO los procesos P1(llegada 0, ráfaga 6, io:[{io_entry:2, io_time:3}]),
  P2(llegada 0, ráfaga 4, io:[{io_entry:1, io_time:4}]),
  P3(llegada 0, ráfaga 3) con Round Robin Virtual y quantum 4
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–2], P2[2–3], P3[3–5], P1[5–7],
  P3[7–8], P1[8–10], P2[10–13]
ENTONCES P1 expropia a P3 en t=5 al volver de E/S (io-return)
ENTONCES P2 espera en la cola del dispositivo de t=3 a t=5 (contención)

## CPU inactiva

DADO un único proceso P1(llegada 2, ráfaga 2) con FCFS
CUANDO se ejecuta la simulación
ENTONCES la CPU está inactiva en el intervalo [0–2]
ENTONCES el diagrama de Gantt muestra el hueco de inactividad y P1[2–4]

DADO un único proceso P1(llegada 4, ráfaga 3, prioridad 2) con Prioridad no expropiativa
CUANDO se ejecuta la simulación
ENTONCES la CPU está inactiva en el intervalo [0–4]
ENTONCES el diagrama de Gantt muestra el hueco de inactividad y P1[4–7]

## Seguridad y tolerancia a fallos (Motor interno)
DADO un escenario extremo que requiere más de 100,000 ticks para completarse
CUANDO el motor ejecuta la simulación
ENTONCES se interrumpe la ejecución y se lanza un error indicando que se excedió el límite de ticks para evitar bucles infinitos

DADO un algoritmo defectuoso o malicioso que selecciona un ID de proceso que no existe
CUANDO el motor intenta asignar ese proceso a la CPU
ENTONCES el motor protege su estado interno dejando la CPU inactiva (lo que eventualmente disparará la protección de límite de ticks si el algoritmo no se recupera)

## Determinismo sin E/S

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

## Determinismo con E/S (VRR)

DADO los procesos P1(llegada 0, ráfaga 6, io:[{io_entry:2, io_time:3}]), P2(llegada 0, ráfaga 4, io:[{io_entry:1, io_time:4}]), P3(llegada 0, ráfaga 3) con Round Robin Virtual y quantum 4
CUANDO se ejecuta la simulación dos veces
ENTONCES ambos resultados son idénticos tick a tick, incluyendo el orden de la cola del dispositivo, los valores de sobrante y las expropiaciones por io-return


DADO dos procesos que alcanzan su io_entry en el mismo tick y el dispositivo está libre
CUANDO el motor decide a cuál admitir primero
ENTONCES el desempate es determinista: menor arrival_time, luego menor id


## Determinismo con niveles (MLFQ)

DADO los procesos P1(llegada 0, ráfaga 8), P2(llegada 0, ráfaga 8) con MLFQ, quanta [2, 10] y sin boostInterval
CUANDO se ejecuta la simulación dos veces
ENTONCES ambos resultados son idénticos, incluyendo el orden de degradación y la asignación de niveles

DADO los mismos procesos P1 y P2 con MLFQ, quanta [2, 10] y boostInterval 6
CUANDO se ejecuta la simulación dos veces
ENTONCES ambos resultados son idénticos, incluyendo el tick exacto del boost, la interrupción del proceso en CPU y el orden de reencolado tras el boost (por menor id)


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


## § Round Robin Virtual — E/S y cola auxiliar

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


## § MLFQ — niveles y degradación

DADO que un proceso llega por primera vez
CUANDO el motor lo inserta en las colas de MLFQ
ENTONCES entra en el nivel 0 (`levels[0]`)


DADO que un proceso agota el quantum de su nivel sin completar
CUANDO el motor aplica la degradación
ENTONCES el proceso pasa al nivel siguiente (`processLevel + 1`), o permanece en el último nivel si ya está en él


DADO que llega un proceso al nivel 0 mientras hay otro proceso en CPU en un nivel inferior
CUANDO el motor evalúa si expropiar (`preemptionMode = 'on-quantum-and-better'`)
ENTONCES el proceso en CPU es expropiado y vuelve a la cabeza de su nivel sin degradarse


DADO que MLFQ tiene `boostInterval` configurado y se alcanza ese tick
CUANDO el motor aplica el *priority boost*
ENTONCES todos los procesos, incluido el que está en CPU en ese instante, suben al nivel 0 y se reevalúa quién debe ejecutar


DADO que el *priority boost* interrumpe al proceso en CPU
CUANDO ese proceso vuelve al nivel 0 junto al resto
ENTONCES el orden de reencolado entre procesos simultáneos se resuelve por menor `id`

> Nota (fixture verificado): `quanta [2,10]`, `boostInterval 6`, `P1` {burst 8}, `P2` {burst 8}, ambos `arrival 0`. Sin boost: P1 completa t=10, P2 t=16. Con boost en t=6 (interrumpe a P1 a mitad de su turno de nivel 1): P1 completa t=12, P2 t=16.


DADO que MLFQ no tiene `boostInterval` configurado
CUANDO los procesos de CPU-bound se degradan a niveles bajos
ENTONCES pueden sufrir inanición; esto se acepta como limitación cuando no hay boost


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


DADO que el test verifica el contenido de un `message`
CUANDO comprueba si el vocabulario clave aparece
ENTONCES usa `toMatch(/cola auxiliar/)`, `toMatch(/nivel 1/)`, etc., en vez de igualdad exacta de string, para no acoplarse a la redacción exacta del motor


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


## § `ProcessForm` — panel desplegable de edición de procesos

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


## § `AlgorithmParamsForm` — edición de parámetros desde la demo

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


## § Render — `SimulationProvider`

DADO un SimulationProvider con procesos válidos y algoritmo FCFS
CUANDO se monta el componente
ENTONCES los componentes hijos acceden al contexto y renderizan sin error

DADO un hook useSimulation() usado fuera de un SimulationProvider
CUANDO se monta el componente
ENTONCES lanza un error descriptivo indicando que falta el proveedor

DADO un SimulationProvider con burst_time = 0 en un proceso
CUANDO se monta el componente
ENTONCES el contexto expone un error y no hay resultado de simulación

DADO un SimulationProvider con componentes visuales pasados como hijos
CUANDO se monta el componente
ENTONCES renderiza el layout definido por esos hijos inyectándoles el contexto de la simulación

DADO un SimulationProvider con hijos personalizados
CUANDO se monta con children explícitos (p. ej. solo GanttChart y PlaybackControls)
ENTONCES renderiza solo los hijos pasados, no el layout por defecto

DADO un SimulationProvider con un nombre de algoritmo que no existe en el registro
CUANDO se monta el componente
ENTONCES el contexto expone un error descriptivo y no lanza excepción no capturada


## § Render — `ProcessTable`

DADO que el algoritmo activo no modela E/S (cualquiera excepto Round Robin Virtual)
CUANDO se renderiza la `ProcessTable`
ENTONCES las columnas de E/S (entrada, tiempo, salida) no aparecen


DADO que el algoritmo activo es Round Robin Virtual
CUANDO se renderiza la `ProcessTable` y algún proceso tiene `io` declarado
ENTONCES aparecen las columnas de entrada de E/S, tiempo de E/S y salida de E/S (derivada)


## § Render — `GanttChart`

DADO que el historial está completamente calculado
CUANDO se renderiza el `GanttChart` por primera vez
ENTONCES la tabla tiene exactamente tantas filas como procesos y tantas columnas como ticks en el historial; su tamaño no cambia durante la reproducción


DADO que el reproductor está en el tick `T`
CUANDO el `GanttChart` está visible
ENTONCES las celdas de los ticks 0 a T muestran su color/trama según el estado; las celdas de los ticks posteriores a T están vacías (sin color)


DADO que el reproductor avanza un tick
CUANDO la columna `T+1` pasa a ser visible
ENTONCES solo cambia el color de esas celdas; el tamaño de la tabla no cambia


DADO que un proceso está en CPU en el tick `T`
CUANDO se muestra la celda correspondiente
ENTONCES aparece con el color sólido asignado a ese proceso; sin texto dentro


DADO que un proceso está en la cola de listos en el tick `T`
CUANDO se muestra la celda correspondiente
ENTONCES aparece con el color del proceso pero en tono claro (opacidad reducida)


DADO que el algoritmo es Round Robin Virtual y un proceso está en servicio en el dispositivo (`inIO`) en el tick `T`
CUANDO se muestra la celda correspondiente
ENTONCES aparece con el color del proceso y una trama diagonal (rayado), distinguible del estado "en espera"


DADO que el algoritmo es Round Robin Virtual y un proceso está esperando el dispositivo (`waitingIO`) en el tick `T`
CUANDO se muestra la celda correspondiente
ENTONCES aparece con el color del proceso y una trama distinta a la del servicio (p. ej. punteado), de modo que se distingan visualmente "esperando dispositivo" y "en servicio"


DADO que la CPU está inactiva en el tick `T`
CUANDO se muestra la celda de la fila correspondiente
ENTONCES aparece con fondo gris distinguible


DADO que un proceso aún no ha llegado o ya ha completado en el tick `T`
CUANDO se muestra la celda correspondiente
ENTONCES aparece vacía (sin color)


DADO que el algoritmo activo no es Round Robin Virtual
CUANDO se renderiza la leyenda del `GanttChart`
ENTONCES no aparecen las columnas "En E/S" ni "Esperando E/S"


## § Render — `MetricsTable`

DADO que el reproductor no está en el último tick
CUANDO el `GanttChart` y el reproductor están visibles
ENTONCES la `MetricsTable` está oculta


DADO que el reproductor alcanza el último tick
CUANDO la `MetricsTable` se hace visible
ENTONCES muestra las métricas por proceso y las agregadas coherentes con el historial completo


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


## § Reproducción automática

DADO una simulación ya calculada en el tick 0
CUANDO el usuario pulsa "reproducir" hacia delante
ENTONCES el tick mostrado avanza automáticamente hasta el último y se detiene

DADO una reproducción detenida en el último tick
CUANDO el usuario pulsa "reproducir" hacia atrás
ENTONCES el tick mostrado disminuye automáticamente hasta 0 y se detiene


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


## § Escenario de ejemplo por defecto

DADO que el usuario abre la página de un algoritmo
CUANDO la página termina de cargar
ENTONCES se muestra el escenario de ejemplo precargado y ya simulable

DADO que el usuario recarga la página dentro de la misma pestaña tras haber editado el escenario
CUANDO vuelve a cargar
ENTONCES se restaura el escenario editado desde `sessionStorage` (persiste dentro de la pestaña)

DADO que el usuario cierra la pestaña y abre una nueva con la misma página
CUANDO la página carga
ENTONCES se muestra el escenario de ejemplo por defecto (sessionStorage se perdió al cerrar)


## § Conjunto vacío

DADO que el componente se configura sin ningún proceso
CUANDO se carga la página
ENTONCES se muestra un estado vacío
ENTONCES no se produce ningún error


## § Persistencia local

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


## Verificación de contrato de algoritmo

DADO que se implementa una clase que cumple `IAlgorithm` con solo `select()` y `preemptionMode`
CUANDO se registra bajo un `name` y se simula
ENTONCES el motor la ejecuta correctamente sin modificar ningún archivo del motor ni del componente


DADO que un algoritmo implementa `onEvent()` y `quantumFor()` además de `select()`
CUANDO se registra y se simula
ENTONCES el motor llama a `onEvent` en cada evento y respeta el slice que devuelve `quantumFor`; el algoritmo nunca accede a internos del motor


DADO que un algoritmo implementa `onEvent()` y devuelve un string con el motivo para un evento
CUANDO el motor compone el mensaje del tick correspondiente
ENTONCES el mensaje incluye el texto del motivo devuelto, no solo la frase genérica


DADO que un algoritmo implementa `onEvent()` y devuelve `null` para un evento
CUANDO el motor compone el mensaje del tick correspondiente
ENTONCES el mensaje es la frase genérica del motor para ese tipo de evento


DADO que los 9 algoritmos están registrados
CUANDO se consulta el registro por cada `name`
ENTONCES todos son recuperables: `fcfs`, `sjf`, `ljf`, `priority-np`, `srtf`, `priority-p`, `round-robin`, `virtual-round-robin`, `mlfq`
