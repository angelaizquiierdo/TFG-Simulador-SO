import { describe, it, expect } from 'vitest';
import { run } from '../../src/core/simulate.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';

const fcfsStub: IAlgorithm = {
  name: 'fcfs-stub-t13',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Sin procesos');
    return first;
  },
};

describe('T-13: Coherencia del history (completed y message)', () => {
  it('completed crece monotónicamente tick a tick', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 3 },
        { id: 'P2', arrival_time: 2, burst_time: 2 },
      ],
      fcfsStub,
    );
    let prev: readonly string[] = [];
    for (const event of result.history) {
      // completed del tick actual contiene todos los del tick anterior
      for (const pid of prev) {
        expect(event.completed).toContain(pid);
      }
      prev = event.completed;
    }
  });

  it('completed es consistente con los ticks de finalización de intervalos', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 2 },
        { id: 'P2', arrival_time: 0, burst_time: 2 },
      ],
      fcfsStub,
    );
    // P1 termina en tiempo 2: en el tick 2, P1 debe estar en completed
    const tick2 = result.history[2];
    if (tick2 !== undefined) {
      expect(tick2.completed).toContain('P1');
    } else {
      // Si no hay tick 2, P1 debe estar en completed en el último tick conocido
      const last = result.history[result.history.length - 1];
      expect(last?.completed).toContain('P1');
    }
  });

  it('los mensajes describen el evento de cada tick', () => {
    const result = run(
      [{ id: 'P1', arrival_time: 0, burst_time: 2 }],
      fcfsStub,
    );
    for (const event of result.history) {
      expect(typeof event.message).toBe('string');
      expect(event.message.length).toBeGreaterThan(0);
    }
    // Tick con CPU inactiva tiene mensaje descriptivo
    const idleResult = run(
      [{ id: 'P1', arrival_time: 2, burst_time: 1 }],
      fcfsStub,
    );
    expect(idleResult.history[0]?.message).toContain('inactiva');
  });
});
