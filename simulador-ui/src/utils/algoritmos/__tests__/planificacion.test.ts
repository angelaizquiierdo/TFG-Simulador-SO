import { describe, it, expect } from 'vitest';
import {
  simularFCFS,
  simularSJF,
  simularLJF,
  simularPrioridadNoExpropiativa,
  simularSRTF,
  simularLRTF,
  simularPrioridadExpropiativa,
  simularRoundRobin,
} from '../../index';
import { crearProceso } from '../../../procesoUtils';

describe('Motor Único de Planificación - 8 Algoritmos', () => {
  describe('Edge Cases Compartidos', () => {
    it('Debe manejar array vacío sin lanzar error', () => {
      const resultado = simularFCFS([]);
      expect(resultado.historial).toHaveLength(0);
      expect(resultado.resultados).toHaveLength(0);
    });

    it('Debe manejar CPU inactiva: primer proceso llega en t > 0', () => {
      const procesos = [
        crearProceso(
          { id: 'P1', tiempoLlegada: 2, tiempoCPU: 3, color: '#FF0000' },
          []
        ),
      ];

      const resultado = simularFCFS(procesos);

      // Primeros dos elementos de gantt deben ser IDLE
      expect(resultado.historial[0].gantt[0]).toBe('IDLE');
      expect(resultado.historial[1].gantt[1]).toBe('IDLE');
      expect(resultado.historial[2].gantt[2]).toBe('P1');
    });
  });

  describe('FCFS (First-Come, First-Served)', () => {
    it('FCFS: 5 procesos con llegadas distintas se ejecutan por orden de llegada', () => {
      const procesos = [
        crearProceso(
          { id: 'P1', tiempoLlegada: 0, tiempoCPU: 3, color: '#FF0000' },
          []
        ),
        crearProceso(
          { id: 'P2', tiempoLlegada: 1, tiempoCPU: 1, color: '#00FF00' },
          []
        ),
        crearProceso(
          { id: 'P3', tiempoLlegada: 2, tiempoCPU: 2, color: '#0000FF' },
          []
        ),
        crearProceso(
          { id: 'P4', tiempoLlegada: 1, tiempoCPU: 4, color: '#FFFF00' },
          []
        ),
        crearProceso(
          { id: 'P5', tiempoLlegada: 3, tiempoCPU: 2, color: '#FF00FF' },
          []
        ),
      ];

      const resultado = simularFCFS(procesos);

      // Orden de terminación: P1 (t=3), P2 (t=4), P4 (t=8), P3 (t=10), P5 (t=12)
      expect(resultado.resultados[0].id).toBe('P1');
      expect(resultado.resultados[1].id).toBe('P2');
      expect(resultado.resultados[2].id).toBe('P4');
      expect(resultado.resultados[3].id).toBe('P3');
      expect(resultado.resultados[4].id).toBe('P5');
    });
  });

  describe('SJF (Shortest Job First)', () => {
    it('SJF: largo en t=0, cortos en t=1 - largo termina primero', () => {
      const procesos = [
        crearProceso(
          { id: 'P1', tiempoLlegada: 0, tiempoCPU: 5, color: '#FF0000' },
          []
        ),
        crearProceso(
          { id: 'P2', tiempoLlegada: 1, tiempoCPU: 2, color: '#00FF00' },
          []
        ),
        crearProceso(
          { id: 'P3', tiempoLlegada: 1, tiempoCPU: 3, color: '#0000FF' },
          []
        ),
      ];

      const resultado = simularSJF(procesos);

      // P1 termina primero (no expropiativo), luego P2 (2 < 3), luego P3
      expect(resultado.resultados[0].id).toBe('P1');
      expect(resultado.resultados[1].id).toBe('P2');
      expect(resultado.resultados[2].id).toBe('P3');
    });
  });

  describe('LJF (Longest Job First)', () => {
    it('LJF: coincidir varios elige siempre mayor ráfaga', () => {
      const procesos = [
        crearProceso(
          { id: 'P1', tiempoLlegada: 0, tiempoCPU: 3, color: '#FF0000' },
          []
        ),
        crearProceso(
          { id: 'P2', tiempoLlegada: 0, tiempoCPU: 5, color: '#00FF00' },
          []
        ),
        crearProceso(
          { id: 'P3', tiempoLlegada: 0, tiempoCPU: 2, color: '#0000FF' },
          []
        ),
      ];

      const resultado = simularLJF(procesos);

      // P2 (5), P1 (3), P3 (2)
      expect(resultado.resultados[0].id).toBe('P2');
      expect(resultado.resultados[1].id).toBe('P1');
      expect(resultado.resultados[2].id).toBe('P3');
    });
  });

  describe('Prioridad No Expropiativa', () => {
    it('Prioridad No Exp: elige menor prioridad (número); corre hasta terminar', () => {
      const procesos = [
        crearProceso(
          {
            id: 'P1',
            tiempoLlegada: 0,
            tiempoCPU: 2,
            prioridad: 3,
            color: '#FF0000',
          },
          []
        ),
        crearProceso(
          {
            id: 'P2',
            tiempoLlegada: 0,
            tiempoCPU: 3,
            prioridad: 1,
            color: '#00FF00',
          },
          []
        ),
        crearProceso(
          {
            id: 'P3',
            tiempoLlegada: 0,
            tiempoCPU: 1,
            prioridad: 2,
            color: '#0000FF',
          },
          []
        ),
      ];

      const resultado = simularPrioridadNoExpropiativa(procesos);

      // P2 (prio 1), P3 (prio 2), P1 (prio 3)
      expect(resultado.resultados[0].id).toBe('P2');
      expect(resultado.resultados[1].id).toBe('P3');
      expect(resultado.resultados[2].id).toBe('P1');
    });
  });

  describe('SRTF (Shortest Remaining Time First)', () => {
    it('SRTF: largo en ejecución es expropiado al llegar corto', () => {
      const procesos = [
        crearProceso(
          { id: 'P1', tiempoLlegada: 0, tiempoCPU: 8, color: '#FF0000' },
          []
        ),
        crearProceso(
          { id: 'P2', tiempoLlegada: 2, tiempoCPU: 3, color: '#00FF00' },
          []
        ),
      ];

      const resultado = simularSRTF(procesos);

      // P1 ejecuta en t=0,1; en t=2 llega P2 y expropia; P2 termina primero
      expect(resultado.resultados[0].id).toBe('P2');
      expect(resultado.resultados[1].id).toBe('P1');

      // Verificar que procesoEnEjecucion cambió en t=2 (tick de expulsión)
      const pasoExpulsion = resultado.historial.find(
        (p) => p.tiempoActual === 2
      );
      expect(pasoExpulsion?.procesoEnEjecucion).toBe('P2');
    });
  });

  describe('LRTF (Longest Remaining Time First)', () => {
    it('LRTF: expropia favoreciendo al de mayor tiempoRestante', () => {
      const procesos = [
        crearProceso(
          { id: 'P1', tiempoLlegada: 0, tiempoCPU: 5, color: '#FF0000' },
          []
        ),
        crearProceso(
          { id: 'P2', tiempoLlegada: 2, tiempoCPU: 3, color: '#00FF00' },
          []
        ),
      ];

      const resultado = simularLRTF(procesos);

      // P1 ejecuta en t=0,1; en t=2 llega P2 pero P1 tiene más restante (4 > 3)
      // LRTF debe favorecer a P1, así que P2 espera
      expect(resultado.resultados[0].id).toBe('P1');
      expect(resultado.resultados[1].id).toBe('P2');
    });
  });

  describe('Prioridad Expropiativa', () => {
    it('Prioridad Exp: llega proceso de mayor prioridad y expropia', () => {
      const procesos = [
        crearProceso(
          {
            id: 'P1',
            tiempoLlegada: 0,
            tiempoCPU: 5,
            prioridad: 2,
            color: '#FF0000',
          },
          []
        ),
        crearProceso(
          {
            id: 'P2',
            tiempoLlegada: 2,
            tiempoCPU: 2,
            prioridad: 1,
            color: '#00FF00',
          },
          []
        ),
      ];

      const resultado = simularPrioridadExpropiativa(procesos);

      // P2 tiene prioridad 1 (mayor que P1 con 2), así que se ejecuta primero
      expect(resultado.resultados[0].id).toBe('P2');
      expect(resultado.resultados[1].id).toBe('P1');
    });
  });

  describe('Round Robin', () => {
    it('Round Robin (quantum=2): alterna cada 2 ticks', () => {
      const procesos = [
        crearProceso(
          { id: 'P1', tiempoLlegada: 0, tiempoCPU: 4, color: '#FF0000' },
          []
        ),
        crearProceso(
          { id: 'P2', tiempoLlegada: 0, tiempoCPU: 4, color: '#00FF00' },
          []
        ),
      ];

      const resultado = simularRoundRobin(procesos, 2);

      // Gantt debe ser: P1, P1, P2, P2, P1, P1, P2, P2
      const ganttFinal = resultado.historial[resultado.historial.length - 1].gantt;
      expect(ganttFinal.slice(0, 2)).toEqual(['P1', 'P1']);
      expect(ganttFinal.slice(2, 4)).toEqual(['P2', 'P2']);
      expect(ganttFinal.slice(4, 6)).toEqual(['P1', 'P1']);
      expect(ganttFinal.slice(6, 8)).toEqual(['P2', 'P2']);
    });
  });

  describe('Métricas', () => {
    it('FCFS: verificar tiempoFin, tiempoRetorno, tiempoEspera (caso de referencia)', () => {
      const procesos = [
        crearProceso(
          { id: 'P1', tiempoLlegada: 0, tiempoCPU: 5, color: '#FF0000' },
          []
        ),
        crearProceso(
          { id: 'P2', tiempoLlegada: 1, tiempoCPU: 3, color: '#00FF00' },
          []
        ),
        crearProceso(
          { id: 'P3', tiempoLlegada: 2, tiempoCPU: 8, color: '#0000FF' },
          []
        ),
        crearProceso(
          { id: 'P4', tiempoLlegada: 3, tiempoCPU: 6, color: '#FFFF00' },
          []
        ),
      ];

      const resultado = simularFCFS(procesos);

      // P1: fin 5, retorno 5, espera 0
      expect(resultado.resultados[0]).toEqual(
        expect.objectContaining({
          id: 'P1',
          tiempoFin: 5,
          tiempoRetorno: 5,
          tiempoEspera: 0,
        })
      );

      // P2: fin 8, retorno 7, espera 4
      expect(resultado.resultados[1]).toEqual(
        expect.objectContaining({
          id: 'P2',
          tiempoFin: 8,
          tiempoRetorno: 7,
          tiempoEspera: 4,
        })
      );

      // P3: fin 16, retorno 14, espera 6
      expect(resultado.resultados[2]).toEqual(
        expect.objectContaining({
          id: 'P3',
          tiempoFin: 16,
          tiempoRetorno: 14,
          tiempoEspera: 6,
        })
      );

      // P4: fin 22, retorno 19, espera 13
      expect(resultado.resultados[3]).toEqual(
        expect.objectContaining({
          id: 'P4',
          tiempoFin: 22,
          tiempoRetorno: 19,
          tiempoEspera: 13,
        })
      );
    });
  });

  describe('Consistencia del Historial', () => {
    it('Para cualquier simulación no vacía: historial.length === gantt.length', () => {
      const procesos = [
        crearProceso(
          { id: 'P1', tiempoLlegada: 0, tiempoCPU: 2, color: '#FF0000' },
          []
        ),
        crearProceso(
          { id: 'P2', tiempoLlegada: 1, tiempoCPU: 3, color: '#00FF00' },
          []
        ),
      ];

      const resultado = simularFCFS(procesos);

      // historial.length debe igual a gantt.length
      const ganttFinal = resultado.historial[resultado.historial.length - 1].gantt;
      expect(resultado.historial.length).toBe(ganttFinal.length);

      // Para cada paso, historial[i].gantt.length === i + 1
      resultado.historial.forEach((paso, i) => {
        expect(paso.gantt.length).toBe(i + 1);
      });
    });

    it('Determinismo de desempate: mismo criterio se ordena por id alfabético', () => {
      const procesos = [
        crearProceso(
          {
            id: 'Z',
            tiempoLlegada: 0,
            tiempoCPU: 2,
            color: '#FF0000',
          },
          []
        ),
        crearProceso(
          {
            id: 'A',
            tiempoLlegada: 0,
            tiempoCPU: 2,
            color: '#00FF00',
          },
          []
        ),
      ];

      const resultado = simularSJF(procesos);

      // A debe ejecutarse antes que Z (mismo tiempoCPU, por id alfabético)
      expect(resultado.historial[0].procesoEnEjecucion).toBe('A');
    });
  });
});
