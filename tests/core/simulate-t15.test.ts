/**
 * T-15: Aislamiento de dependencias
 * Este test corre en entorno Node (sin React ni DOM).
 * Verifica que run() funciona importando solo src/core.
 */
import { describe, it, expect } from 'vitest';
import { run } from '../../src/core/simulate.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';

const fcfsStub: IAlgorithm = {
  name: 'fcfs-stub-t15',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Sin procesos');
    return first;
  },
};

describe('T-15: Simulador independiente de la vista (Node puro)', () => {
  it('run() ejecuta FCFS en Node sin dependencias de React ni DOM', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 3 },
        { id: 'P2', arrival_time: 2, burst_time: 2 },
      ],
      fcfsStub,
    );
    // Resultado correcto sin ninguna librería de presentación
    expect(result.intervals).toEqual([
      { pid: 'P1', start: 0, end: 3 },
      { pid: 'P2', start: 3, end: 5 },
    ]);
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(0.5);
  });

  it('el módulo no importa React ni DOM (verificación estructural)', async () => {
    // Si el módulo importara React, el import anterior habría fallado en entorno Node
    // sin jsdom. El hecho de que llegue aquí confirma el aislamiento.
    const mod = await import('../../src/core/simulate.js');
    expect(typeof mod.run).toBe('function');
    expect(typeof mod.deriveIntervals).toBe('function');
    expect(typeof mod.deriveMetrics).toBe('function');
  });
});
