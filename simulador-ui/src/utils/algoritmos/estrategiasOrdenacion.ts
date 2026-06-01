import type { ProcesoControlFinal } from '../../types/proceso';

// FCFS (First-Come, First-Served): Menor tiempoLlegada primero
export const ordenarFCFS = (
  a: ProcesoControlFinal,
  b: ProcesoControlFinal
): number => {
  if (a.tiempoLlegada !== b.tiempoLlegada) {
    return a.tiempoLlegada - b.tiempoLlegada;
  }
  return a.tiempoLlegada - b.tiempoLlegada;
};

// SJF (Shortest Job First): Menor tiempoCPU primero, desempate por tiempoLlegada
export const ordenarSJF = (
  a: ProcesoControlFinal,
  b: ProcesoControlFinal
): number => {
  if (a.tiempoCPU !== b.tiempoCPU) {
    return a.tiempoCPU - b.tiempoCPU;
  }
  return a.tiempoLlegada - b.tiempoLlegada;
};

// LJF (Longest Job First): Mayor tiempoCPU primero, desempate por tiempoLlegada
export const ordenarLJF = (
  a: ProcesoControlFinal,
  b: ProcesoControlFinal
): number => {
  if (a.tiempoCPU !== b.tiempoCPU) {
    return b.tiempoCPU - a.tiempoCPU;
  }
  return a.tiempoLlegada - b.tiempoLlegada;
};

// Prioridad No Expropiativa: Menor prioridad primero, desempate por tiempoLlegada
export const ordenarPrioridad = (
  a: ProcesoControlFinal,
  b: ProcesoControlFinal
): number => {
  const prioridadA = a.prioridad ?? Infinity;
  const prioridadB = b.prioridad ?? Infinity;

  if (prioridadA !== prioridadB) {
    return prioridadA - prioridadB;
  }
  return a.tiempoLlegada - b.tiempoLlegada;
};
