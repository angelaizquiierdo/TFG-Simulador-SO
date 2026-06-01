import type { Proceso, ProcesoControlFinal, EstadoPaso } from '../../types/proceso';
import { simularNoExpropiativo } from './motorNoExpropiativo';
import {
  ordenarFCFS,
  ordenarSJF,
  ordenarLJF,
  ordenarPrioridad,
} from './estrategiasOrdenacion';

export interface ResultadoSimulacion {
  historial: EstadoPaso[];
  resultados: ProcesoControlFinal[];
}

/**
 * Simula FCFS (First-Come, First-Served) - Orden de llegada
 */
export function simularFCFS(procesos: Proceso[]): ResultadoSimulacion {
  return simularNoExpropiativo(procesos, ordenarFCFS);
}

/**
 * Simula SJF (Shortest Job First) - Ráfaga más corta primero
 */
export function simularSJF(procesos: Proceso[]): ResultadoSimulacion {
  return simularNoExpropiativo(procesos, ordenarSJF);
}

/**
 * Simula LJF (Longest Job First) - Ráfaga más larga primero
 */
export function simularLJF(procesos: Proceso[]): ResultadoSimulacion {
  return simularNoExpropiativo(procesos, ordenarLJF);
}

/**
 * Simula Prioridad No Expropiativa - Prioridad más alta primero
 */
export function simularPrioridad(procesos: Proceso[]): ResultadoSimulacion {
  return simularNoExpropiativo(procesos, ordenarPrioridad);
}

export * from './motorNoExpropiativo';
export * from './estrategiasOrdenacion';
