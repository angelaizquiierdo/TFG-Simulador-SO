# Acceptance Criteria — v01

## Contrato de algoritmo (extensibilidad)

DADO un algoritmo nuevo que implementa la interfaz `IAlgoritmo` y se registra por su nombre
CUANDO el simulador lo ejecuta sobre un conjunto de procesos
ENTONCES produce un resultado (intervalos, historial y métricas) sin que se modifique el motor

DADO un algoritmo cuyo `requiere` no incluye prioridad
CUANDO el componente muestra el escenario
ENTONCES no se muestra la prioridad de los procesos

## Simulador independiente de la vista

DADO un script de Node sin ninguna librería de interfaz
CUANDO importa el simulador y ejecuta una simulación
ENTONCES obtiene el resultado (intervalos, historial y métricas) sin dependencias de presentación

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

DADO los procesos P1(llegada 0, ráfaga 3) y P2(llegada 2, ráfaga 2) con FCFS
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–3], P2[3–5]
ENTONCES el tiempo de espera medio es 0.5
ENTONCES el tiempo de retorno medio es 3

## Simular — SJF (no expropiativo)

DADO los procesos P1(llegada 0, ráfaga 4), P2(llegada 1, ráfaga 2) y P3(llegada 2, ráfaga 1) con SJF
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–4], P3[4–5], P2[5–7]

## Simular — LJF (no expropiativo)

DADO los procesos P1(llegada 0, ráfaga 2), P2(llegada 0, ráfaga 4) y P3(llegada 0, ráfaga 3) con LJF
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P2[0–4], P3[4–7], P1[7–9]

## Simular — SRTF (expropiativo)

DADO los procesos P1(llegada 0, ráfaga 5) y P2(llegada 1, ráfaga 2) con SRTF
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–1], P2[1–3], P1[3–7]
ENTONCES P2 finaliza en el tick 3 y P1 finaliza en el tick 7

## Simular — Round Robin

DADO los procesos P1(llegada 0, ráfaga 4) y P2(llegada 0, ráfaga 3) con Round Robin y quantum 2
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–2], P2[2–4], P1[4–6], P2[6–7]

## Simular — Prioridad (no expropiativa)

DADO los procesos P1(llegada 0, ráfaga 3, prioridad 2) y P2(llegada 0, ráfaga 1, prioridad 1) con Prioridad no expropiativa
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P2[0–1], P1[1–4]

## Simular — Prioridad (expropiativa)

DADO los procesos P1(llegada 0, ráfaga 4, prioridad 3) y P2(llegada 2, ráfaga 2, prioridad 1) con Prioridad expropiativa
CUANDO se ejecuta la simulación
ENTONCES el diagrama de Gantt es P1[0–2], P2[2–4], P1[4–6]

## CPU inactiva

DADO un único proceso P1(llegada 2, ráfaga 2) con FCFS
CUANDO se ejecuta la simulación
ENTONCES la CPU está inactiva en el intervalo [0–2]
ENTONCES el diagrama de Gantt muestra el hueco de inactividad y P1[2–4]

## Determinismo

DADO un conjunto de procesos y un algoritmo cualesquiera
CUANDO se ejecuta la simulación dos veces
ENTONCES ambos resultados son idénticos tick a tick

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

## Coherencia de métricas y estado

DADO la simulación situada en un tick T
CUANDO se observa la lista de procesos completados
ENTONCES contiene exactamente los procesos cuya finalización ocurrió en T o antes

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