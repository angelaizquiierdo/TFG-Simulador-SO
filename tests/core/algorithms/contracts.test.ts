import { describe, it, expect } from 'vitest';
import type { IAlgorithm, ReadyProcess } from '../../../src/core/types/algorithm.js';
import { register, get } from '../../../src/core/registry.js';
import { run } from '../../../src/core/simulate.js';

// Algoritmo externo mínimo para verificar el contrato de extensibilidad
class LIFO implements IAlgorithm {
  readonly name = 'LIFO-test';
  readonly preemptionMode = 'none' as const;
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const p = ready[ready.length - 1];
    if (p === undefined) throw new Error('Lista vacía');
    return p;
  }
}

describe('Contrato de algoritmo (extensibilidad)', () => {
  // BEHAVIOURS § Contrato de algoritmo — caso 1:
  // Un algoritmo externo registrado puede ejecutar run() sin modificar el motor
  it('algoritmo externo registrado produce resultado sin modificar el motor', () => {
    const lifo = new LIFO();
    register(lifo);
    const retrieved = get('LIFO-test');
    expect(retrieved.name).toBe('LIFO-test');

    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 3 },
    ];
    const result = run(processes, retrieved);
    expect(result.history.length).toBeGreaterThan(0);
    expect(result.intervals.length).toBeGreaterThan(0);
    expect(result.metrics.processes.length).toBe(2);
    // LIFO selecciona el último: P2 tiene id mayor, irá primero
    expect(result.intervals[0]?.pid).toBe('P2');
  });

  // BEHAVIOURS § Contrato de algoritmo — caso 2:
  // Un algoritmo sin requires.priority no necesita el campo priority en los procesos
  it('algoritmo sin requires.priority no necesita el campo priority', () => {
    const lifo = new LIFO();
    const req: { priority?: boolean; quantum?: boolean } = lifo.requires;
    expect(req.priority).toBeUndefined();

    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
    ];
    // No tiene campo priority — debe ejecutarse sin error
    expect(() => run(processes, lifo)).not.toThrow();
  });
});
