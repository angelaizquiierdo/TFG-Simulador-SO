# CPUSchedulerSimulator — Functional Spec

## Objetivo


Construir un componente web que simula la planificador de CPU monoprocesador que ejecute los algoritmos de planificación clásicos sobre un conjunto de procesos definido por el usuario, calcule la línea temporal completa de forma determinista y permita reproducirla visualmente hacia delante y hacia atrás, mostrando el estado del planificador en cada instante y las métricas resultantes por proceso y agregadas.

Se centra en el componente: se configura con un algoritmo y una configuración del problema, y se ejecuta por completo en el navegador. Las páginas del sitio (una por algoritmo) son solo demos de cómo funciona el componente. 

El simulador es una herramienta didáctica: su valor está en *ver y entender* cómo cada algoritmo toma decisiones, no en ejecutar cargas reales.

---

## Usuarios y contexto

- **Usuario principal:** son los estudiantes y docentes de la asignatura de Sistemas Operativos que quieren visualizar y comparar el comportamiento de los algoritmos de planificación.

- **Contexto de uso** es un componente que se puede añadir a cualquier página web, indicándole el algoritmo y la configuración del problema. Se ejecuta por completo en el navegador y renderiza tanto la simulación como la interfaz de navegación temporal. Está pensado para ser escalable (añadir nuevos algoritmos sin modificar el componente).
---

## Funcionalidades

### Configuración del componente (entrada)

- **El componente recibe como configuración**: un conjunto de procesos, el algoritmo (indicado por un identificador o nombre) y los parámetros del algoritmo (p. ej.
quantum en Round Robin: entero > 0). 
- Cada proceso tiene: identificador (p. ej. P1), tiempo de llegada (entero ≥ 0,obligatorio), ráfaga de CPU (entero > 0, obligatorio) y prioridad (entero > 0,opcional; solo en algoritmos de prioridad; convención: menor número = mayor
prioridad).
- **En v1 la entrada es fija**: el conjunto de procesos, el algoritmo y la configuración constituyen la configuración del problema y no se modifican desde la interfaz. Para mostrar otro ejemplo se cambia la configuración del componente.

### Arquitectura Modular y Extensible (Patrón Estrategia)
- **Desacoplamiento por Interfaz**: El simulador debe ofrecer una interfaz clara y abstracta (IAlgorithm) que actúe como un contrato estricto para cualquier solución de planificación de CPU.

- **Encapsulamiento en Clases Independientes**: Cada algoritmo de planificación debe implementarse en su propia clase aislada. Queda estrictamente prohibido mezclar la lógica interna del algoritmo con la lógica de control, tiempo o renderizado del simulador.

- **Selección por Identificador**: El motor del simulador debe interactuar con los algoritmos de forma genérica a través de la interfaz, seleccionando la estrategia activa mediante un identificador único (un string o el nombre de la propia clase) gestionado por la interfaz de usuario.



### Algoritmo (una página por algoritmo)

El algoritmo se indica al componente mediante un identificador (o el nombre de la clase que lo implementa) y el simulador lo usa para simular.

**Extensibilidad**: el simulador expone una interfaz para implementar nuevos
algoritmos; basta implementar esa interfaz y registrar el algoritmo bajo un nombre. En
v1 se incluyen solo los algoritmos clásicos:
- No expropiativos:
  - FCFS (First-Come, First-Served)
  - SJF (Shortest Job First)
  - LJF (Longest Job First)
  - Prioridad (no expropiativa)
- Expropiativos:
  - Round Robin (con quantum configurable)
  - SRTF (Shortest Remaining Time First)
  - Prioridad (expropiativa)


Cada algoritmo declara qué campos de proceso requiere (p. ej. prioridad) y qué parámetros necesita (p. ej. quantum). El componente usa esa declaración para validar la configuración y mostrar la información pertinente.


### Simulación

A partir de la entrada y el algoritmo, el simulador calcula de una sola vez la línea temporal completa. Su salida son datos, no elementos visuales:
- **Intervalos de la línea temporal** (qué proceso ocupa la CPU en cada intervalo, incluyendo huecos de inactividad), que el componente renderiza como diagrama de Gantt;
- **Historial de estados tick a tick**, que alimenta la reproducción e incluye un mensaje por evento (qué proceso entra en CPU, cuál finaliza y cuál entra en la cola de listos);
- las métricas por proceso y agregadas.


El tiempo es discreto y entero (ticks ≥ 0), existe una única CPU.
El diagrama de Gantt es render del componente a partir de esos datos; el simulador solo produce los datos.


### Navegación temporal y reproducción 

En cada instante se visualiza el estado del algoritmo: proceso en CPU, cola de listos, procesos aún no llegados y procesos completados.
La navegación recorre un resultado ya calculado; no recalcula nada al moverse.
- **Automática:** reproducir/pausar, en sentido hacia delante y hacia atrás, con velocidad ajustable.
- **Manual:** avanzar y retroceder un tick mediante botones, y saltar directamente a un tick concreto (barra de desplazamiento).

### Métricas

- **Por proceso:** tiempo de finalización, tiempo de retorno, tiempo de espera y tiempo de respuesta.
- **Agregadas:** espera media, retorno medio, utilización de la CPU y rendimiento.
- Las métricas las renderiza el componente y se muestran al completar el recorrido de la simulación; son coherentes con el estado visualizado en cada momento.
- **Configurable**: mediante la configuración del componente se elige qué métricas
mostrar, o ninguna.


### Demos (algotimos por pagina)


- Para probar el componente se crea un sitio con una página por algoritmo, cada una con un escenario de ejemplo precargado, de modo que sea útil de inmediato.
- Para ver otro ejemplo se cambia la configuración del componente; no hay edición desde la propia página. No hay persistencia entre sesiones: al recargar, la página vuelve al escenario de ejemplo.

## Modelo de datos (resumen funcional)


- **Proceso:** `id`, `arrival_time` (≥ 0), `burst_time` (> 0), `priority` (opcional).
- **Configuración:** algoritmo seleccionado y sus parámetros (p. ej. `quantum`).
- **Estado del planificador (por tick):** instante actual, proceso en CPU (o inactivo), cola de listos, ráfagas restantes, procesos pendientes de llegar y procesos completados con su información de finalización.
- **Resultado de la simulación:** diagrama de Gantt (intervalos), historial de estados y métricas por proceso y agregadas.

---

## Reglas de determinismo y casos límite

- **Determinismo:** la misma entrada con el mismo algoritmo produce siempre exactamente el mismo resultado.
- **Desempates (orden global, aplicado tras el criterio propio del algoritmo):**
  1) criterio del algoritmo (burst_time, priority, etc.);
  2) menor arrival_time;
  3) menor identificador / orden de inserción (desempate final que garantiza un resultado único).
- **Round Robin, coincidencia en un tick:** cuando una llegada y la expiración del *quantum* ocurren en el mismo tick, el proceso que llega entra en la cola de listos **antes** que el proceso cuyo *quantum* expira.
- **CPU inactiva:** si en un tick no hay ningún proceso disponible, la CPU queda inactiva y el hueco se refleja en el diagrama de Gantt. 
- **Conjunto vacío:** sin procesos, la simulación no produce línea temporal y la interfaz muestra un estado vacío, sin errores.
- **Casos triviales válidos:** un único proceso; todos los procesos llegando en `t = 0`; *quantum* mayor que todas las ráfagas (Round Robin se comporta como FCFS).

---

## Requisitos no funcionales (a nivel de producto)


- **Determinismo** como garantía funcional (ver reglas arriba).
- **Rendimiento percibido**: el cálculo de la línea temporal es instantáneo para el
usuario.


---

## Fuera de alcance (v1)

- **Modificar soluciones parciales de la simulación:** ir a un tick pasado, cambiar un estado y re-derivar un futuro distinto (escenarios *what-if*). Excluido de v1.
- Inyección de procesos en vivo durante una ejecución en curso.
- Multiprocesador, múltiples núcleos afinidad de CPU.
- Ráfagas de E/S y estados de bloqueo (espera por E/S).
- Envejecimiento de prioridades y colas multinivel.
- Persistencia del escenario entre sesiones (localStorage).
- Backend, colaboración multiusuario, compartir escenarios en la nube y exportación de resultados.

