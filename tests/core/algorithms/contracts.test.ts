import { describe, it, expect } from 'vitest';
import { run } from '../../../src/core/simulate.js';
import type { IAlgorithm, ReadyProcess, SchedulerEvent } from '../../../src/core/types/algorithm.js';
import { FCFS } from '../../../src/core/algorithms/non-preemptive/fcfs.js';
import { SJF } from '../../../src/core/algorithms/non-preemptive/sjf.js';
import { LJF } from '../../../src/core/algorithms/non-preemptive/ljf.js';
import { PriorityNP } from '../../../src/core/algorithms/non-preemptive/priority-np.js';
import { SRTF } from '../../../src/core/algorithms/preemptive/srtf.js';
import { PriorityP } from '../../../src/core/algorithms/preemptive/priority-p.js';
import { RoundRobin } from '../../../src/core/algorithms/preemptive/round-robin.js';
import { VirtualRoundRobin } from '../../../src/core/algorithms/preemptive/virtual-round-robin.js';
import { MultilevelFeedback } from '../../../src/core/algorithms/preemptive/multilevel-feedback.js';

// Algoritmo de prueba con onEvent y quantumFor
class TestAlgorithm implements IAlgorithm {
  readonly name = 'test-algo';
  readonly preemptionMode = 'on-quantum' as const;
  readonly requires = { priority: false, quantum: true, io: false };
  readonly events: string[] = [];

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('cola vacía');
    const first = ready[0];
    if (first === undefined) throw new Error('cola vacía');
    return first;
  }

  quantumFor(): number | null {
    return 2;
  }

  onEvent(e: SchedulerEvent): string | null {
    this.events.push(e.type);
    if (e.type === 'dispatch') return `Test: despacha ${e.id}`;
    return null;
  }
}

describe('Contrato de extensibilidad (T-36)', () => {
  it('algoritmo con onEvent y quantumFor funciona sin modificar el motor', () => {
    const algo = new TestAlgorithm();
    const r = run([
      { id: 'A', arrival_time: 0, burst_time: 4 },
      { id: 'B', arrival_time: 0, burst_time: 2 },
    ], { algorithm: algo });
    expect(r.history.length).toBeGreaterThan(0);
    expect(r.intervals.length).toBeGreaterThan(0);
    expect(r.metrics.length).toBe(2);
    // onEvent fue llamado
    expect(algo.events).toContain('arrival');
    expect(algo.events).toContain('dispatch');
  });

  it('mensaje rico de onEvent aparece en history', () => {
    const algo = new TestAlgorithm();
    const r = run([
      { id: 'A', arrival_time: 0, burst_time: 2 },
    ], { algorithm: algo });
    const hasRichMsg = r.history.some(h => /Test: despacha/i.test(h.message));
    expect(hasRichMsg).toBe(true);
  });

  it('select en cola vacía lanza error en todos los algoritmos', () => {
    const algos: IAlgorithm[] = [
      new FCFS(), new SJF(), new LJF(), new PriorityNP(),
      new SRTF(), new PriorityP(), new RoundRobin(),
      new VirtualRoundRobin(4), new MultilevelFeedback([2]),
    ];
    for (const a of algos) {
      expect(() => a.select([])).toThrow();
    }
  });

  it('todos los algoritmos tienen los campos obligatorios de IAlgorithm', () => {
    const algos: IAlgorithm[] = [
      new FCFS(), new SJF(), new LJF(), new PriorityNP(),
      new SRTF(), new PriorityP(), new RoundRobin(),
      new VirtualRoundRobin(4), new MultilevelFeedback([2]),
    ];
    for (const a of algos) {
      expect(typeof a.name).toBe('string');
      expect(typeof a.preemptionMode).toBe('string');
      expect(typeof a.requires).toBe('object');
      expect(typeof a.select).toBe('function');
    }
  });

  it('algoritmos clásicos ignoran campo io en procesos', () => {
    const algos: IAlgorithm[] = [new FCFS(), new SJF(), new LJF(), new RoundRobin()];
    const procsWithIO = [
      { id: 'P1', arrival_time: 0, burst_time: 3, io: [{ io_entry: 1, io_time: 2 }] },
      { id: 'P2', arrival_time: 0, burst_time: 2 },
    ];
    const procsWithoutIO = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 0, burst_time: 2 },
    ];
    for (const a of algos) {
      const r1 = run(procsWithIO, { algorithm: a, quantum: 4 });
      const r2 = run(procsWithoutIO, { algorithm: a, quantum: 4 });
      expect(r1.intervals).toEqual(r2.intervals);
    }
  });
});
