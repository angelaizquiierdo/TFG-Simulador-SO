/**
 * @file procesoUtils.ts
 * @description Funciones de apoyo (factoría) del Simulador de S.O. Actúan como
 * constructores seguros y defensivos en tiempo de ejecución: validan los datos
 * de entrada y devuelven estructuras coherentes para el motor de planificación.
 *
 * TypeScript puro: sin dependencias de React ni de frameworks de UI.
 */

import {
  type Proceso,
  type ProcesoControlFinal,
  type EstadoPaso,
  type EstadoProcesoEnTiempo,
  NombreEstadoProceso,
} from '../types/proceso';

/**
 * @description Paleta de colores hexadecimales por defecto usada para pintar los
 * procesos en el diagrama de Gantt cuando el usuario no proporciona un color.
 */
const PALETA_COLORES: readonly string[] = [
  '#ef4444', // rojo
  '#f59e0b', // ámbar
  '#10b981', // esmeralda
  '#3b82f6', // azul
  '#8b5cf6', // violeta
  '#ec4899', // rosa
  '#14b8a6', // teal
  '#f97316', // naranja
  '#6366f1', // índigo
  '#84cc16', // lima
];

/**
 * @description Asigna automáticamente un color hexadecimal evitando, en la medida
 * de lo posible, repetir los ya usados por los procesos existentes.
 */
function asignarColorAutomatico(procesosExistentes: Proceso[]): string {
  const usados = new Set(procesosExistentes.map((p) => p.color));
  const libre = PALETA_COLORES.find((c) => !usados.has(c));
  if (libre) return libre;
  // Si se agota la paleta, se cicla por índice para seguir siendo determinista.
  return PALETA_COLORES[procesosExistentes.length % PALETA_COLORES.length];
}

/**
 * @description Valida los datos de entrada del formulario y retorna un objeto Proceso seguro.
 * @param datos Datos parciales provenientes del formulario de usuario.
 * @param procesosExistentes Lista de procesos ya registrados, usada para garantizar IDs únicos.
 * @returns Un objeto Proceso validado e inmutable.
 * @throws Error si el id está vacío, está duplicado, tiempoLlegada es negativo o tiempoCPU es menor que 1.
 */
export function crearProceso(
  datos: Partial<Proceso>,
  procesosExistentes: Proceso[],
): Proceso {
  // 1. El id no puede estar vacío ni contener solo espacios.
  const id = (datos.id ?? '').trim();
  if (id === '') {
    throw new Error('El "id" del proceso no puede estar vacío ni contener solo espacios.');
  }

  // 2. El id debe ser único.
  if (procesosExistentes.some((p) => p.id === id)) {
    throw new Error(`El "id" "${id}" ya existe: el identificador del proceso está duplicado.`);
  }

  // 3. tiempoLlegada no puede ser negativo.
  const tiempoLlegada = datos.tiempoLlegada ?? 0;
  if (tiempoLlegada < 0) {
    throw new Error('El "tiempoLlegada" no puede ser negativo.');
  }

  // 4. tiempoCPU debe ser estrictamente mayor que cero (>= 1).
  const tiempoCPU = datos.tiempoCPU ?? 0;
  if (tiempoCPU < 1) {
    throw new Error('El "tiempoCPU" debe ser estrictamente mayor que cero (>= 1).');
  }

  // Lógica: asignar color automático si no se proporciona uno válido.
  const color =
    datos.color && datos.color.trim() !== ''
      ? datos.color.trim()
      : asignarColorAutomatico(procesosExistentes);

  const proceso: Proceso = {
    id,
    tiempoLlegada,
    tiempoCPU,
    color,
  };

  // Conservar los campos opcionales solo si fueron proporcionados.
  if (datos.tiempoLlegadaES !== undefined) proceso.tiempoLlegadaES = datos.tiempoLlegadaES;
  if (datos.tiempoES !== undefined) proceso.tiempoES = datos.tiempoES;
  if (datos.prioridad !== undefined) proceso.prioridad = datos.prioridad;

  return proceso;
}

/**
 * @description Convierte un Proceso de usuario en la estructura mutable de control requerida por el motor.
 * @param p Proceso de origen, previamente validado.
 * @returns Un ProcesoControlFinal con tiempoRestante inicializado y métricas pendientes en undefined.
 * @throws Error si el proceso de origen no tiene un id válido o sus tiempos son incoherentes.
 */
export function inicializarControlProceso(p: Proceso): ProcesoControlFinal {
  // Validaciones obligatorias: id válido y tiempos coherentes antes de transformar.
  if (!p || typeof p.id !== 'string' || p.id.trim() === '') {
    throw new Error('No se puede inicializar el control: el proceso de origen carece de un "id" válido.');
  }
  if (typeof p.tiempoCPU !== 'number' || p.tiempoCPU < 1) {
    throw new Error(`No se puede inicializar el control del proceso "${p.id}": "tiempoCPU" incoherente.`);
  }
  if (typeof p.tiempoLlegada !== 'number' || p.tiempoLlegada < 0) {
    throw new Error(`No se puede inicializar el control del proceso "${p.id}": "tiempoLlegada" incoherente.`);
  }

  // Lógica: extender el proceso original e inicializar el estado mutable.
  return {
    ...p,
    tiempoRestante: p.tiempoCPU,
    tiempoFin: undefined,
    tiempoRetorno: undefined,
    tiempoEspera: undefined,
  };
}

/**
 * @description Inicializa el sistema operativo en el instante t=0, construyendo el primer snapshot del historial.
 * @param procesos Lista de procesos del sistema configurados por el usuario.
 * @returns El EstadoPaso correspondiente al tick inicial (t=0).
 */
export function crearPasoInicial(procesos: Proceso[]): EstadoPaso {
  const colaListos: string[] = [];

  // 4. Construcción de estadosProcesos evaluando el tiempoLlegada de cada proceso.
  const estadosProcesos: EstadoProcesoEnTiempo[] = procesos.map((p) => {
    if (p.tiempoLlegada === 0) {
      colaListos.push(p.id);
      return {
        id: p.id,
        estado: NombreEstadoProceso.Esperando,
        tiempoEjecutado: 0,
      };
    }
    // p.tiempoLlegada > 0 -> NotArrived y NO entra en colaListos.
    return {
      id: p.id,
      estado: NombreEstadoProceso.NotArrived,
      tiempoEjecutado: 0,
    };
  });

  return {
    tiempoActual: 0, // 1. El reloj inicial se fija en 0.
    procesoEnEjecucion: null, // 2. Sin proceso en CPU al inicio.
    estadosProcesos,
    colaListos,
    colaBloqueados: [], // 5. Cola de bloqueados vacía.
    mensaje: 'Sistema inicializado. Esperando planificación.', // 6. Mensaje inicial.
    gantt: [], // 3. Historial de Gantt vacío.
  };
}