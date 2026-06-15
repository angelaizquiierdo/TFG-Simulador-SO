# Acceptance Criteria — v01

## Registro de algoritmos (Motor interno)

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

## Configuración inválida

DADO que el componente se configura con un proceso de ráfaga 0
CUANDO se carga la página
ENTONCES no se ejecuta la simulación
ENTONCES se muestra un error de configuración: "La ráfaga debe ser mayor que 0"

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

## Determinismo

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

## Reproducción automática

DADO una simulación ya calculada en el tick 0
CUANDO el usuario pulsa "reproducir" hacia delante
ENTONCES el tick mostrado avanza automáticamente hasta el último y se detiene

DADO una reproducción detenida en el último tick
CUANDO el usuario pulsa "reproducir" hacia atrás
ENTONCES el tick mostrado disminuye automáticamente hasta 0 y se detiene

## Navegación manual

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

## Coherencia de métricas y estado

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

## Escenario de ejemplo por defecto

DADO que el usuario abre la página de un algoritmo
CUANDO la página termina de cargar
ENTONCES se muestra el escenario de ejemplo precargado y ya simulable

DADO que el usuario recarga la página
CUANDO vuelve a cargar
ENTONCES se muestra el mismo escenario de ejemplo (no hay persistencia entre sesiones)

## Conjunto vacío

DADO que el componente se configura sin ningún proceso
CUANDO se carga la página
ENTONCES se muestra un estado vacío
ENTONCES no se produce ningún error

## Renderizado — SimulationProvider

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

## Renderizado — ProcessTable

DADO un SimulationProvider con 3 procesos y algoritmo FCFS
CUANDO ProcessTable se renderiza
ENTONCES muestra una tabla con cabecera (id, arrival_time, burst_time) y 3 filas de datos
ENTONCES las filas tienen fondo alternado para legibilidad

DADO un SimulationProvider con algoritmo Prioridad
CUANDO ProcessTable se renderiza
ENTONCES la cabecera incluye la columna priority

DADO un SimulationProvider con algoritmo FCFS
CUANDO ProcessTable se renderiza
ENTONCES la cabecera no incluye la columna priority

## Renderizado — GanttChart (matriz sincronizada)

DADO un SimulationProvider con P1(llegada 0, ráfaga 3) y P2(llegada 1, ráfaga 2) con FCFS
CUANDO GanttChart se renderiza
ENTONCES muestra el mensaje del evento del tick actual encima de la matriz
ENTONCES muestra una matriz con cabecera de ticks (0, 1, 2…) y cabecera de procesos (P1, P2)
ENTONCES los nombres de proceso en la cabecera lateral son legibles (fondo neutro visible, no transparente)
ENTONCES debajo de la matriz muestra el título "Leyenda" seguido de la tabla de leyenda

DADO la matriz del GanttChart
CUANDO se observa cualquier celda
ENTONCES la celda no contiene texto (ni "CPU", ni "W", ni ninguna etiqueta)
ENTONCES el estado se indica solo con el color de fondo

DADO el reproductor en el tick 0
CUANDO GanttChart se renderiza
ENTONCES la matriz muestra solo la columna del tick 0

DADO el reproductor en el tick 2
CUANDO GanttChart se renderiza
ENTONCES la matriz muestra las columnas de los ticks 0, 1 y 2

DADO el reproductor avanzando del tick 2 al tick 3
CUANDO el usuario pulsa paso adelante
ENTONCES se añade la columna del tick 3 a la matriz
ENTONCES el mensaje se actualiza al evento del tick 3

DADO el reproductor retrocediendo del tick 3 al tick 2
CUANDO el usuario pulsa paso atrás
ENTONCES se quita la columna del tick 3 de la matriz
ENTONCES el mensaje se actualiza al evento del tick 2

DADO el reproductor en el último tick
CUANDO GanttChart se renderiza
ENTONCES la matriz muestra todas las columnas (diagrama completo)

DADO la matriz del GanttChart con P1 en CPU en tick 0
CUANDO se observa la celda P1/tick 0
ENTONCES tiene el color sólido asignado a P1

DADO la matriz del GanttChart con P2 en espera en tick 1
CUANDO se observa la celda P2/tick 1
ENTONCES tiene el color del proceso con opacidad reducida (más claro que "en CPU")

DADO la matriz del GanttChart con P2 no llegado en tick 0
CUANDO se observa la celda P2/tick 0
ENTONCES la celda tiene fondo gris muy claro (no transparente ni blanco puro)

DADO un SimulationProvider con P1(llegada 2, ráfaga 2) con FCFS
CUANDO GanttChart se renderiza en tick 1
ENTONCES los ticks 0 y 1 muestran inactividad (fondo gris)

DADO un SimulationProvider con 3 procesos
CUANDO GanttChart se renderiza
ENTONCES cada proceso tiene un color distinto asignado automáticamente
ENTONCES la leyenda muestra una matriz con una fila por proceso y columnas: Inactivo, En espera, En CPU
ENTONCES cada celda de la leyenda tiene el color correspondiente a esa combinación proceso/estado

DADO la matriz del GanttChart con P1 ya completado en un tick posterior a su finalización
CUANDO se observa la celda P1/tick posterior
ENTONCES la celda tiene fondo gris muy claro (mismo que "no llegado")

## Renderizado — PlaybackControls

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

## Renderizado — MetricsTable

DADO un SimulationProvider con una simulación calculada y el cursor en un tick intermedio
CUANDO MetricsTable se renderiza
ENTONCES no muestra ninguna tabla de métricas (ocultas hasta el final)

DADO un SimulationProvider con el cursor en el último tick
CUANDO MetricsTable se renderiza
ENTONCES muestra la tabla de métricas por proceso con columnas: id, completion, turnaround, waiting, response
ENTONCES muestra la tabla de métricas agregadas con: avgWaiting, avgTurnaround, cpuUtilization, throughput