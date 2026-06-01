import type {
  ProcesoControlFinal,
  ConfiguracionSimulador,
} from '../../types/proceso';
import type {
  PoliticaPlanificacion,
  ContextoTick,
} from './motorPlanificacion';
import {
  compararFCFS,
  compararSJF,
  compararLJF,
  compararPrioridad,
  compararSRTF,
  compararLRTF,
  compararFIFO,
} from './comparadores';

const nuncaExpropia = (): boolean => false;

const obtenerPrioridad = (p: ProcesoControlFinal): number =>
  p.prioridad ?? Number.POSITIVE_INFINITY;

// ===== NO EXPROPIATIVOS =====

export const politicaFCFS: PoliticaPlanificacion = {
  nombre: 'FCFS',
  config: { expropiativo: false, usaPrioridades: false },
  comparar: compararFCFS,
  debeExpropiar: nuncaExpropia,
};

export const politicaSJF: PoliticaPlanificacion = {
  nombre: 'SJF',
  config: { expropiativo: false, usaPrioridades: false },
  comparar: compararSJF,
  debeExpropiar: nuncaExpropia,
};

export const politicaLJF: PoliticaPlanificacion = {
  nombre: 'LJF',
  config: { expropiativo: false, usaPrioridades: false },
  comparar: compararLJF,
  debeExpropiar: nuncaExpropia,
};

export const politicaPrioridadNoExpropiativa: PoliticaPlanificacion = {
  nombre: 'Prioridad No Expropiativa',
  config: { expropiativo: false, usaPrioridades: true },
  comparar: compararPrioridad,
  debeExpropiar: nuncaExpropia,
};

// ===== EXPROPIATIVOS =====

export const politicaSRTF: PoliticaPlanificacion = {
  nombre: 'SRTF',
  config: { expropiativo: true, usaPrioridades: false },
  comparar: compararSRTF,
  debeExpropiar: (_ctx, colaListos) => {
    // Expropia si hay alguno con tiempoRestante más corto (desigualdad estricta)
    return colaListos.some(
      (q) => q.tiempoRestante < _ctx.procesoEnEjecucion.tiempoRestante
    );
  },
};

export const politicaLRTF: PoliticaPlanificacion = {
  nombre: 'LRTF',
  config: { expropiativo: true, usaPrioridades: false },
  comparar: compararLRTF,
  debeExpropiar: (_ctx, colaListos) => {
    // Expropia si hay alguno con tiempoRestante más largo (desigualdad estricta)
    return colaListos.some(
      (q) => q.tiempoRestante > _ctx.procesoEnEjecucion.tiempoRestante
    );
  },
};

export const politicaPrioridadExpropiativa: PoliticaPlanificacion = {
  nombre: 'Prioridad Expropiativa',
  config: { expropiativo: true, usaPrioridades: true },
  comparar: compararPrioridad,
  debeExpropiar: (_ctx, colaListos) => {
    // Expropia si hay alguno con mayor prioridad (menor número)
    const prioActual = obtenerPrioridad(_ctx.procesoEnEjecucion);
    return colaListos.some((q) => obtenerPrioridad(q) < prioActual);
  },
};

// ===== ROUND ROBIN =====

export function crearPoliticaRoundRobin(
  tiempoMaximoTurno: number
): PoliticaPlanificacion {
  return {
    nombre: `Round Robin (quantum=${tiempoMaximoTurno})`,
    config: { expropiativo: true, usaPrioridades: false, tiempoMaximoTurno },
    comparar: compararFIFO,
    debeExpropiar: (ctx) => {
      // Expropia si agotó el quantum
      return ctx.ticksEnCPU >= tiempoMaximoTurno;
    },
  };
}
