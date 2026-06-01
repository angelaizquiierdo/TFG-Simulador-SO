import type { Proceso, ProcesoControlFinal, EstadoPaso } from '../../types/proceso';
import { simular } from './motorPlanificacion';
import {
  politicaFCFS,
  politicaSJF,
  politicaLJF,
  politicaPrioridadNoExpropiativa,
  politicaSRTF,
  politicaLRTF,
  politicaPrioridadExpropiativa,
  crearPoliticaRoundRobin,
} from './politicas';

export interface ResultadoSimulacion {
  historial: EstadoPaso[];
  resultados: ProcesoControlFinal[];
}

// NO EXPROPIATIVOS
export function simularFCFS(procesos: Proceso[]): ResultadoSimulacion {
  return simular(procesos, politicaFCFS);
}

export function simularSJF(procesos: Proceso[]): ResultadoSimulacion {
  return simular(procesos, politicaSJF);
}

export function simularLJF(procesos: Proceso[]): ResultadoSimulacion {
  return simular(procesos, politicaLJF);
}

export function simularPrioridadNoExpropiativa(
  procesos: Proceso[]
): ResultadoSimulacion {
  return simular(procesos, politicaPrioridadNoExpropiativa);
}

// EXPROPIATIVOS
export function simularSRTF(procesos: Proceso[]): ResultadoSimulacion {
  return simular(procesos, politicaSRTF);
}

export function simularLRTF(procesos: Proceso[]): ResultadoSimulacion {
  return simular(procesos, politicaLRTF);
}

export function simularPrioridadExpropiativa(
  procesos: Proceso[]
): ResultadoSimulacion {
  return simular(procesos, politicaPrioridadExpropiativa);
}

// ROUND ROBIN
export function simularRoundRobin(
  procesos: Proceso[],
  quantum: number = 4
): ResultadoSimulacion {
  return simular(procesos, crearPoliticaRoundRobin(quantum));
}

// Re-exportar motor, políticas y tipos para acceso directo si es necesario
export * from './motorPlanificacion';
export * from './politicas';
export * from './comparadores';

