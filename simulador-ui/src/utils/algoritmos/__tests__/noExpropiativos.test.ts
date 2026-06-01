import { describe, it, expect } from 'vitest';
import {
  simularFCFS,
  simularSJF,
  simularLJF,
  simularPrioridad,
} from '../../index';
import { crearProceso } from '../../../procesoUtils';

describe('Algoritmos No Expropiativos', () => {
  describe('Edge Cases', () => {
    it('Debe manejar correctamente un array vacío de procesos', () => {
      const resultado = simularFCFS([]);
      expect(resultado.historial).toHaveLength(1);
      expect(resultado.historial[0].tiempoActual).toBe(0);
      expect(resultado.historial[0].procesoEnEjecucion).toBeNull();
      expect(resultado.resultados).toHaveLength(0);
    });

    it('Debe simular correctamente el tiempo inactivo (CPU idle) si el primer proceso llega en t > 0', () => {
      const procesos = [
        crearProceso(
          {
            id: 'P1',
            tiempoLlegada: 3,
            tiempoCPU: 2,
            color: '#FF0000',
          },
          []
        ),
      ];

      const resultado = simularFCFS(procesos);

      // Debe haber ticks antes de que P1 llegue (t=0,1,2,3)
      expect(resultado.historial[0].procesoEnEjecucion).toBeNull();
      expect(resultado.historial[0].mensaje).toContain('ociosa');

      // P1 debe comenzar en t=3
      const pasoP1Inicia = resultado.historial.find(
        (p) => p.tiempoActual === 3
      );
      expect(pasoP1Inicia?.procesoEnEjecucion).toBe('P1');

      // P1 debe terminar en t=5
      expect(resultado.resultados[0].tiempoFin).toBe(5);
    });
  });

  describe('FCFS (First-Come, First-Served)', () => {
    it('FCFS 1: Dados 3 procesos que llegan en el mismo instante, debe ejecutarlos en el orden exacto de inserción', () => {
      const procesos = [
        crearProceso(
          { id: 'P1', tiempoLlegada: 0, tiempoCPU: 2, color: '#FF0000' },
          []
        ),
        crearProceso(
          {
            id: 'P2',
            tiempoLlegada: 0,
            tiempoCPU: 3,
            color: '#00FF00',
          },
          []
        ),
        crearProceso(
          {
            id: 'P3',
            tiempoLlegada: 0,
            tiempoCPU: 1,
            color: '#0000FF',
          },
          []
        ),
      ];

      const resultado = simularFCFS(procesos);
      const ganttFinal = resultado.historial[resultado.historial.length - 1].gantt;

      // Orden esperado: P1, P2, P3
      expect(ganttFinal.slice(0, 2)).toEqual(['P1', 'P1']); // P1 toma 2 ticks
      expect(ganttFinal.slice(2, 5)).toEqual(['P2', 'P2', 'P2']); // P2 toma 3 ticks
      expect(ganttFinal.slice(5, 6)).toEqual(['P3']); // P3 toma 1 tick
    });

    it('FCFS 2: Dados 5 procesos con tiempos de ráfaga variados y distintos tiempos de llegada, debe ejecutarlos por orden de llegada', () => {
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

      // Orden esperado: P1 (t=0-2), P2 (t=3), P4 (t=4-7), P3 (t=8-9), P5 (t=10-11)
      expect(resultado.resultados[0].id).toBe('P1');
      expect(resultado.resultados[1].id).toBe('P2');
      expect(resultado.resultados[2].id).toBe('P4');
      expect(resultado.resultados[3].id).toBe('P3');
      expect(resultado.resultados[4].id).toBe('P5');
    });
  });

  describe('SJF (Shortest Job First)', () => {
    it('SJF 1: Dado un proceso largo en t=0 y dos cortos en t=1, el largo debe terminar primero, seguido del más corto de los otros dos', () => {
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

      // P1 debe terminar primero (no expropiativo)
      expect(resultado.resultados[0].id).toBe('P1');
      expect(resultado.resultados[0].tiempoFin).toBe(5);

      // Luego P2 (SJF: 2 < 3)
      expect(resultado.resultados[1].id).toBe('P2');

      // Finalmente P3
      expect(resultado.resultados[2].id).toBe('P3');
    });

    it('SJF 2: Dado un proceso largo (ráfaga 8) en t=0 y 4 procesos cortos (1,3,2,5) llegando en t=1 y t=2, ejecutar largo primero, luego cortos en orden 1,2,3,5', () => {
      const procesos = [
        crearProceso(
          { id: 'P1', tiempoLlegada: 0, tiempoCPU: 8, color: '#FF0000' },
          []
        ),
        crearProceso(
          { id: 'P2', tiempoLlegada: 1, tiempoCPU: 1, color: '#00FF00' },
          []
        ),
        crearProceso(
          { id: 'P3', tiempoLlegada: 1, tiempoCPU: 3, color: '#0000FF' },
          []
        ),
        crearProceso(
          { id: 'P4', tiempoLlegada: 2, tiempoCPU: 2, color: '#FFFF00' },
          []
        ),
        crearProceso(
          { id: 'P5', tiempoLlegada: 2, tiempoCPU: 5, color: '#FF00FF' },
          []
        ),
      ];

      const resultado = simularSJF(procesos);

      // Orden esperado: P1, P2, P4, P3, P5
      expect(resultado.resultados[0].id).toBe('P1'); // ráfaga 8
      expect(resultado.resultados[1].id).toBe('P2'); // ráfaga 1
      expect(resultado.resultados[2].id).toBe('P4'); // ráfaga 2
      expect(resultado.resultados[3].id).toBe('P3'); // ráfaga 3
      expect(resultado.resultados[4].id).toBe('P5'); // ráfaga 5
    });
  });

  describe('LJF (Longest Job First)', () => {
    it('LJF: Al llegar varios a la vez, debe elegir siempre el de mayor ráfaga', () => {
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

      // Orden esperado: P2 (5), P1 (3), P3 (2)
      expect(resultado.resultados[0].id).toBe('P2');
      expect(resultado.resultados[1].id).toBe('P1');
      expect(resultado.resultados[2].id).toBe('P3');
    });
  });

  describe('Prioridad No Expropiativa', () => {
    it('Prioridad: Si hay varios procesos esperando, se escoge estrictamente el de menor número en el campo prioridad', () => {
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

      const resultado = simularPrioridad(procesos);

      // Orden esperado: P2 (prioridad 1), P3 (prioridad 2), P1 (prioridad 3)
      expect(resultado.resultados[0].id).toBe('P2');
      expect(resultado.resultados[1].id).toBe('P3');
      expect(resultado.resultados[2].id).toBe('P1');
    });
  });
});
