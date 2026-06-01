import type { ProcesoControlFinal } from '../../types/proceso';

// Helper: componer criterio principal con desempate (tiempoLlegada + id)
function conDesempate(
  criterioPrincipal: (p: ProcesoControlFinal) => number | undefined
) {
  return (a: ProcesoControlFinal, b: ProcesoControlFinal): number => {
    const valorA = criterioPrincipal(a) ?? Number.POSITIVE_INFINITY;
    const valorB = criterioPrincipal(b) ?? Number.POSITIVE_INFINITY;

    if (valorA !== valorB) {
      return valorA - valorB;
    }

    // Desempate 1: tiempoLlegada
    if (a.tiempoLlegada !== b.tiempoLlegada) {
      return a.tiempoLlegada - b.tiempoLlegada;
    }

    // Desempate 2: id alfabético
    return a.id.localeCompare(b.id);
  };
}

// FCFS: menor tiempoLlegada primero
export const compararFCFS = conDesempate((p) => p.tiempoLlegada);

// SJF: menor tiempoCPU (ráfaga original) primero
export const compararSJF = conDesempate((p) => p.tiempoCPU);

// LJF: mayor tiempoCPU primero (negativo para invertir orden)
export const compararLJF = conDesempate((p) => -p.tiempoCPU);

// Prioridad: menor prioridad primero (0 es máxima, undefined es mínima)
export const compararPrioridad = conDesempate((p) => p.prioridad);

// SRTF: menor tiempoRestante (ráfaga restante) primero
export const compararSRTF = conDesempate((p) => p.tiempoRestante);

// LRTF: mayor tiempoRestante primero (negativo para invertir)
export const compararLRTF = conDesempate((p) => -p.tiempoRestante);

// FIFO para Round Robin: no reordena, preserva orden de cola (sort estable)
export const compararFIFO = (): number => 0;
