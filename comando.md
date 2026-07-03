Quiero que implementes esta mejora directamente en el código del proyecto.

## Objetivo

Los algoritmos clásicos de planificación de CPU deben generar mensajes descriptivos en el diagrama de Gantt, igual que ya hacen Virtual Round Robin (VRR) y MLFQ.

Actualmente, algoritmos como FCFS, SJF, LJF, Prioridad (expropiativa y no expropiativa), SRTF y Round Robin únicamente generan mensajes del tipo:

- "P1 entra en CPU"
- "P2 toma la CPU"

Quiero que expliquen el motivo de la decisión del planificador.

Ejemplos del comportamiento esperado:

FCFS
- "P1, primer proceso en llegar a la cola de preparados, entra en CPU."

SJF
- "P2, con la ráfaga de CPU más corta (3), entra en CPU."

LJF
- "P3, con la ráfaga de CPU más larga (12), entra en CPU."

Prioridad no expropiativa
- "P4, de mayor prioridad (0), entra en CPU."

SRTF
- "P2, con el menor tiempo restante (2), entra en CPU."

Prioridad expropiativa
- dispatch:
  "P2, de mayor prioridad (0), entra en CPU."
- preempted:
  "P1 fue expropiado por un proceso de mayor prioridad."

Round Robin
- dispatch:
  "P3 entra en CPU al ser el primer proceso de la cola Round Robin."
- quantum-expiry:
  "P3 agotó su quantum y vuelve al final de la cola."

La referencia de estilo debe ser la implementación existente de VirtualRoundRobin y MLFQ.

--------------------------------------------------

## Restricciones

NO modificar:

- SchedulerEvent
- IAlgorithm
- ReadyProcess
- SchedulerEngine
- Scheduler
- tipos
- contratos públicos
- API
- flujo del motor
- sistema de eventos

No añadir nuevos eventos.

No añadir nuevos triggers.

No modificar interfaces.

No cambiar el tipado.

No introducir callbacks nuevos.

Toda la lógica debe permanecer encapsulada dentro de cada algoritmo utilizando exclusivamente onEvent() y estado interno privado, exactamente igual que hace VirtualRoundRobin.

--------------------------------------------------

## Implementación

Analiza primero cómo están implementados:

- VirtualRoundRobin
- MLFQ

y reutiliza el mismo patrón arquitectónico.

Cada algoritmo clásico deberá producir mensajes específicos según su criterio de selección.

El mensaje de dispatch debe responder siempre a la pregunta:

"¿Por qué este proceso ha sido seleccionado?"

No quiero mensajes genéricos.

Siempre que sea posible incluye el valor utilizado por el algoritmo:

FCFS
- orden de llegada

SJF
- CPU Burst

LJF
- CPU Burst

SRTF
- Remaining Burst

Priority
- prioridad

Round Robin
- posición en la cola Round Robin

No dupliques lógica del motor.

No rompas la encapsulación existente.

--------------------------------------------------

## Documentación

Actualiza únicamente:

TECHNICAL.md
PLAN.md
SPECS.md

explicando el nuevo comportamiento.

No inventes funcionalidades nuevas.

--------------------------------------------------

## Tests

Actualiza únicamente:

BEHAVIOURS.md

para reflejar los nuevos mensajes esperados.

No cambies la estrategia de tests.

--------------------------------------------------

## Calidad del código

Antes de modificar nada:

1. Analiza la implementación de VRR.
2. Analiza MLFQ.
3. Analiza cómo funciona actualmente onEvent().
4. Reutiliza el mismo estilo.
5. Mantén consistencia en nombres y estructura.

No hagas refactorizaciones innecesarias.

No cambies el diseño del proyecto.

No modifiques archivos no relacionados.

--------------------------------------------------

## Al finalizar

Quiero un resumen con:

- Archivos modificados.
- Qué mensajes nuevos genera cada algoritmo.
- Confirmación de que no se modificó el motor ni el sistema de tipos.
- Confirmación de que la arquitectura sigue siendo compatible con VRR y MLFQ.