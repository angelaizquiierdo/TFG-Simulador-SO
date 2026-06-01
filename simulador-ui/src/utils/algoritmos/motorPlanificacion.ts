import type {
  Proceso,
  ProcesoControlFinal,
  EstadoPaso,
  EstadoProcesoEnTiempo,
  ConfiguracionSimulador,
} from '../../types/proceso';
import { inicializarControlProceso } from '../procesoUtils';

export interface ContextoTick {
  tiempoActual: number;
  ticksEnCPU: number;
  procesoEnEjecucion: ProcesoControlFinal;
}

export interface PoliticaPlanificacion {
  nombre: string;
  config: ConfiguracionSimulador;
  comparar(a: ProcesoControlFinal, b: ProcesoControlFinal): number;
  debeExpropiar(ctx: ContextoTick, colaListos: ProcesoControlFinal[]): boolean;
}

export function simular(
  procesos: Proceso[],
  politica: PoliticaPlanificacion
): { historial: EstadoPaso[]; resultados: ProcesoControlFinal[] } {
  // Caso vacío
  if (procesos.length === 0) {
    return { historial: [], resultados: [] };
  }

  const controles: ProcesoControlFinal[] = procesos.map((p) =>
    inicializarControlProceso(p)
  );

  let colaListos: ProcesoControlFinal[] = [];
  let procesoActual: ProcesoControlFinal | null = null;
  let ticksEnCPU = 0;
  let t = 0;
  const historial: EstadoPaso[] = [];
  const gantt: string[] = [];
  const completados: ProcesoControlFinal[] = [];
  let ultimoMensaje = '';

  const tiempoMaximoTotal = controles.reduce((sum, p) => sum + p.tiempoCPU, 0);
  const SALVAGUARDA = tiempoMaximoTotal + 10000;

  while (completados.length < controles.length && t <= SALVAGUARDA) {
    // 1. Llegadas: agregar procesos con tiempoLlegada === t
    for (const c of controles) {
      if (c.tiempoLlegada === t && c.tiempoRestante > 0 && !colaListos.includes(c) && c !== procesoActual) {
        colaListos.push(c);
      }
    }

    // 2. Expropiación: si hay proceso en CPU, evaluar si debe expulsarse
    if (procesoActual) {
      const ctx: ContextoTick = {
        tiempoActual: t,
        ticksEnCPU,
        procesoEnEjecucion: procesoActual,
      };
      if (politica.debeExpropiar(ctx, colaListos)) {
        colaListos.push(procesoActual);
        procesoActual = null;
        ticksEnCPU = 0;
        ultimoMensaje = `${colaListos[colaListos.length - 1].id} expropiado`;
      }
    }

    // 3. Selección: si CPU libre y hay en cola, ordenar y asignar
    if (!procesoActual && colaListos.length > 0) {
      colaListos.sort(politica.comparar);
      procesoActual = colaListos.shift()!;
      ticksEnCPU = 0;
      ultimoMensaje = `${procesoActual.id} entra a ejecución`;
    }

    // 4. Ejecución
    if (procesoActual) {
      procesoActual.tiempoRestante -= 1;
      ticksEnCPU += 1;
      gantt.push(procesoActual.id);
    } else {
      gantt.push('IDLE');
    }

    // 5. Mensaje (será actualizado en paso 7 si hay terminación)
    if (!ultimoMensaje || ultimoMensaje === '') {
      if (procesoActual) {
        ultimoMensaje = `${procesoActual.id} en ejecución`;
      } else {
        ultimoMensaje = 'CPU inactiva';
      }
    }

    // 6. Snapshot ANTES de dar de baja
    const estadosProcesos: EstadoProcesoEnTiempo[] = controles.map((c) => {
      let estado: 'ejecutando' | 'esperando' | 'bloqueado' | 'not-arrived' | 'terminado';

      if (c.tiempoLlegada > t) {
        estado = 'not-arrived';
      } else if (c.tiempoFin !== undefined && t >= c.tiempoFin) {
        estado = 'terminado';
      } else if (c === procesoActual) {
        estado = 'ejecutando';
      } else if (colaListos.includes(c)) {
        estado = 'esperando';
      } else {
        estado = 'not-arrived';
      }

      return {
        id: c.id,
        estado,
        tiempoEjecutado: c.tiempoCPU - c.tiempoRestante,
      };
    });

    historial.push({
      tiempoActual: t,
      procesoEnEjecucion: procesoActual?.id ?? null,
      estadosProcesos,
      colaListos: colaListos.map((p) => p.id),
      colaBloqueados: [],
      mensaje: ultimoMensaje,
      gantt: [...gantt],
    });

    // 7. Terminación
    if (procesoActual && procesoActual.tiempoRestante === 0) {
      procesoActual.tiempoFin = t + 1;
      procesoActual.tiempoRetorno =
        procesoActual.tiempoFin - procesoActual.tiempoLlegada;
      procesoActual.tiempoEspera =
        procesoActual.tiempoRetorno - procesoActual.tiempoCPU;
      completados.push(procesoActual);
      ultimoMensaje = `${procesoActual.id} finaliza en t=${t + 1}`;
      procesoActual = null;
      ticksEnCPU = 0;
    } else {
      ultimoMensaje = '';
    }

    t += 1;
  }

  if (t > SALVAGUARDA) {
    throw new Error('Simulación superó limite máximo de iteraciones (posible bucle infinito)');
  }

  return {
    historial,
    resultados: completados,
  };
}
