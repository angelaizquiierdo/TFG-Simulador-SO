import type {
  Proceso,
  ProcesoControlFinal,
  EstadoPaso,
  EstadoProcesoEnTiempo,
} from '../types/proceso';

/**
 * Genera un color hexadecimal aleatorio.
 */
function generarColorAleatorio(): string {
  const colores = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#FFA07A',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E2',
    '#F8B88B',
    '#52B788',
  ];
  return colores[Math.floor(Math.random() * colores.length)];
}

/**
 * Valida que los tiempos sean válidos (no negativos).
 */
function validarTiempos(tiempoLlegada: number, tiempoCPU: number): void {
  if (tiempoLlegada < 0) {
    throw new Error('tiempoLlegada no puede ser negativo');
  }
  if (tiempoCPU < 0) {
    throw new Error('tiempoCPU no puede ser negativo');
  }
}

/**
 * Crea un proceso válido con los datos proporcionados.
 * Asigna un color por defecto si no se proporciona uno.
 *
 * @param datos - Datos parciales del proceso
 * @returns Proceso validado y completo
 * @throws Error si los tiempos son negativos o datos requeridos están faltando
 */
export function crearProceso(datos: Partial<Proceso>): Proceso {
  const { id, tiempoLlegada, tiempoCPU, color, ...resto } = datos;

  if (!id || tiempoLlegada === undefined || tiempoCPU === undefined) {
    throw new Error('id, tiempoLlegada y tiempoCPU son requeridos');
  }

  validarTiempos(tiempoLlegada, tiempoCPU);

  return {
    id,
    tiempoLlegada,
    tiempoCPU,
    color: color || generarColorAleatorio(),
    ...resto,
  };
}

/**
 * Inicializa un ProcesoControlFinal a partir de un Proceso.
 * Prepara el proceso para el seguimiento durante la simulación.
 *
 * @param p - Proceso base
 * @returns ProcesoControlFinal con campos de control inicializados
 */
export function inicializarControlProceso(p: Proceso): ProcesoControlFinal {
  return {
    ...p,
    tiempoRestante: p.tiempoCPU,
    tiempoFin: undefined,
    tiempoRetorno: undefined,
    tiempoEspera: undefined,
  };
}

/**
 * Crea el paso inicial del sistema en tiempoActual = 0.
 * Inicializa todos los estados de los procesos.
 *
 * @param procesos - Array de procesos de entrada
 * @returns EstadoPaso representando el estado inicial
 */
export function crearPasoInicial(procesos: Proceso[]): EstadoPaso {
  // Crear estados de todos los procesos
  const estadosProcesos: EstadoProcesoEnTiempo[] = procesos.map((p) => ({
    id: p.id,
    estado: p.tiempoLlegada === 0 ? 'esperando' : 'not-arrived',
    tiempoEjecutado: 0,
  }));

  // Cola listos: solo procesos que llegan en t=0
  const colaListos: string[] = procesos
    .filter((p) => p.tiempoLlegada === 0)
    .map((p) => p.id);

  return {
    tiempoActual: 0,
    procesoEnEjecucion: null,
    estadosProcesos,
    colaListos,
    colaBloqueados: [],
    mensaje:
      'Simulación iniciada. Procesos listos para ejecutar: ' +
      colaListos.join(', '),
    gantt: [],
  };
}
