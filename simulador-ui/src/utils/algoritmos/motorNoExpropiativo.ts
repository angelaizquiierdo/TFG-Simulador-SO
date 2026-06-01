import type {
  Proceso,
  ProcesoControlFinal,
  EstadoPaso,
  EstadoProcesoEnTiempo,
} from '../../types/proceso';
import { inicializarControlProceso } from '../procesoUtils';

type ComparadorProcesos = (
  a: ProcesoControlFinal,
  b: ProcesoControlFinal
) => number;

export function simularNoExpropiativo(
  procesos: Proceso[],
  ordenarColaListos: ComparadorProcesos
): { historial: EstadoPaso[]; resultados: ProcesoControlFinal[] } {
  if (procesos.length === 0) {
    return {
      historial: [
        {
          tiempoActual: 0,
          procesoEnEjecucion: null,
          estadosProcesos: [],
          colaListos: [],
          colaBloqueados: [],
          mensaje: 'Sin procesos para simular',
          gantt: [],
        },
      ],
      resultados: [],
    };
  }

  const procesosControl: ProcesoControlFinal[] = procesos.map((p) =>
    inicializarControlProceso(p)
  );

  const historial: EstadoPaso[] = [];
  let procesoEnEjecucion: ProcesoControlFinal | null = null;
  let gantt: string[] = [];
  const completados: ProcesoControlFinal[] = [];

  const tiempoMaximo = Math.max(
    ...procesosControl.map((p) => p.tiempoLlegada + p.tiempoCPU)
  );

  for (let t = 0; t <= tiempoMaximo; t++) {
    // Actualizar colaListos: procesos que ya llegaron y no han terminado
    let colaListos: ProcesoControlFinal[] = procesosControl.filter(
      (p) => p.tiempoLlegada <= t && p.tiempoRestante > 0 && p !== procesoEnEjecucion
    );

    // Aplicar ordenamiento
    colaListos.sort(ordenarColaListos);

    // Si hay proceso en ejecución y sigue con tiempoRestante > 0, mantenerlo
    if (procesoEnEjecucion && procesoEnEjecucion.tiempoRestante > 0) {
      // Ejecutar el proceso actual
      procesoEnEjecucion.tiempoRestante--;
      gantt.push(procesoEnEjecucion.id);

      // Verificar si terminó
      if (procesoEnEjecucion.tiempoRestante === 0) {
        procesoEnEjecucion.tiempoFin = t;
        procesoEnEjecucion.tiempoRetorno =
          procesoEnEjecucion.tiempoFin - procesoEnEjecucion.tiempoLlegada;
        procesoEnEjecucion.tiempoEspera =
          procesoEnEjecucion.tiempoRetorno - procesoEnEjecucion.tiempoCPU;
        completados.push(procesoEnEjecucion);
        procesoEnEjecucion = null;
      }
    }

    // Si no hay proceso en ejecución y hay en cola, asignar el primero
    if (!procesoEnEjecucion && colaListos.length > 0) {
      procesoEnEjecucion = colaListos[0];
      colaListos = colaListos.slice(1);
    }

    // Generar estado de todos los procesos
    const estadosProcesos: EstadoProcesoEnTiempo[] = procesosControl.map((p) => {
      let estado: 'ejecutando' | 'esperando' | 'bloqueado' | 'not-arrived' | 'terminado';

      if (p.tiempoCPU - p.tiempoRestante === 0 && p.tiempoLlegada > t) {
        estado = 'not-arrived';
      } else if (p.tiempoRestante === 0) {
        estado = 'terminado';
      } else if (p === procesoEnEjecucion) {
        estado = 'ejecutando';
      } else if (p.tiempoLlegada <= t && p.tiempoRestante > 0) {
        estado = 'esperando';
      } else {
        estado = 'not-arrived';
      }

      return {
        id: p.id,
        estado,
        tiempoEjecutado: p.tiempoCPU - p.tiempoRestante,
      };
    });

    const mensaje =
      procesoEnEjecucion && procesoEnEjecucion.tiempoRestante > 0
        ? `${procesoEnEjecucion.id} en ejecución (restante: ${procesoEnEjecucion.tiempoRestante})`
        : 'CPU ociosa';

    historial.push({
      tiempoActual: t,
      procesoEnEjecucion: procesoEnEjecucion?.id || null,
      estadosProcesos,
      colaListos: colaListos.map((p) => p.id),
      colaBloqueados: [],
      mensaje,
      gantt: [...gantt],
    });

    // Salir si todos han terminado
    if (completados.length === procesosControl.length) {
      break;
    }
  }

  return {
    historial,
    resultados: completados,
  };
}
