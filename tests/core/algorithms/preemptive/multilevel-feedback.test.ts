import { describe, it, expect } from 'vitest';
import { MLFQ } from '../../../../src/core/algorithms/preemptive/multilevel-feedback.js';
import { run } from '../../../../src/core/simulate.js';
import { register } from '../../../../src/core/registry.js';
import type { Process } from '../../../../src/core/types/process.js';

// Registrar instancias de prueba con nombre único
register(new MLFQ([2, 10], 'test-mlfq-2-10'));
register(new MLFQ([2, 10], 'test-mlfq-2-10-b6'));
register(new MLFQ([2, 5], 'test-mlfq-2-5'));
register(new MLFQ([2, 5], 'test-mlfq-exp'));

// Procesos del fixture principal (BEHAVIOURSv-02.md § Simular — MLFQ)
const P1: Process = { id: 'P1', arrival_time: 0, burst_time: 8 };
const P2: Process = { id: 'P2', arrival_time: 0, burst_time: 8 };

// Helper para crear ReadyProcess de prueba
function rp(id: string, arrival: number, burst: number, remaining?: number) {
  return { id, arrival_time: arrival, burst_time: burst, remaining: remaining ?? burst };
}

describe('§ Simular — MLFQ (expropiativa) — sin boostInterval', () => {
  const result = run([P1, P2], { algorithm: 'test-mlfq-2-10' });

  it('Gantt: P1[0-2], P2[2-4], P1[4-10], P2[10-16]', () => {
    const nonNull = result.intervals.filter((i) => i.pid !== null);
    expect(nonNull).toEqual([
      { pid: 'P1', start: 0, end: 2 },
      { pid: 'P2', start: 2, end: 4 },
      { pid: 'P1', start: 4, end: 10 },
      { pid: 'P2', start: 10, end: 16 },
    ]);
  });

  it('P1 completa en t=10, P2 en t=16', () => {
    const m1 = result.metrics.perProcess.find((m) => m.id === 'P1');
    const m2 = result.metrics.perProcess.find((m) => m.id === 'P2');
    expect(m1?.completion).toBe(10);
    expect(m2?.completion).toBe(16);
  });

  it('el mensaje del tick 2 menciona degradación al nivel 1', () => {
    const h = result.history[2];
    expect(h?.message).toMatch(/nivel 1/);
  });

  it('determinismo: dos ejecuciones producen resultado idéntico', () => {
    const r2 = run([P1, P2], { algorithm: 'test-mlfq-2-10' });
    expect(result.intervals).toEqual(r2.intervals);
    expect(result.history.map((e) => e.onCPU)).toEqual(r2.history.map((e) => e.onCPU));
  });
});

describe('§ Simular — MLFQ (expropiativa) — con boostInterval=6', () => {
  const result = run([P1, P2], { algorithm: 'test-mlfq-2-10-b6', boostInterval: 6 });

  it('Gantt: P1[0-2], P2[2-4], P1[4-8], P2[8-10], P1[10-12], P2[12-16]', () => {
    // P1 corre continuamente de 4 a 8 (tick 6 hay boost pero P1 sigue en CPU).
    // deriveIntervals fusiona intervalos consecutivos del mismo PID.
    const nonNull = result.intervals.filter((i) => i.pid !== null);
    expect(nonNull).toEqual([
      { pid: 'P1', start: 0, end: 2 },
      { pid: 'P2', start: 2, end: 4 },
      { pid: 'P1', start: 4, end: 8 },
      { pid: 'P2', start: 8, end: 10 },
      { pid: 'P1', start: 10, end: 12 },
      { pid: 'P2', start: 12, end: 16 },
    ]);
  });

  it('P1 completa en t=12 (el boost quitó la ventaja de nivel 1)', () => {
    const m1 = result.metrics.perProcess.find((m) => m.id === 'P1');
    expect(m1?.completion).toBe(12);
  });

  it('el mensaje del tick 6 menciona "priority boost"', () => {
    const h = result.history[6];
    expect(h?.message).toMatch(/priority boost/);
  });

  it('determinismo: dos ejecuciones con boost producen resultado idéntico', () => {
    const r2 = run([P1, P2], { algorithm: 'test-mlfq-2-10-b6', boostInterval: 6 });
    expect(result.intervals).toEqual(r2.intervals);
  });
});

describe('§ MLFQ — niveles y degradación (unit)', () => {
  it('hay exactamente 3 niveles: nivel 0 (q=quanta[0]), nivel 1 (q=quanta[1]), nivel 2 (null)', () => {
    const algo = new MLFQ([3, 7]);
    algo.onEvent({ type: 'arrival', id: 'A', tick: 0 });
    algo.onEvent({ type: 'dispatch', id: 'A', tick: 0 });
    expect(algo.quantumFor(rp('A', 0, 10))).toBe(3); // nivel 0

    algo.onEvent({ type: 'quantum-expiry', id: 'A', tick: 3 }); // →1
    algo.onEvent({ type: 'dispatch', id: 'A', tick: 3 });
    expect(algo.quantumFor(rp('A', 0, 10))).toBe(7); // nivel 1

    algo.onEvent({ type: 'quantum-expiry', id: 'A', tick: 10 }); // →2
    algo.onEvent({ type: 'dispatch', id: 'A', tick: 10 });
    expect(algo.quantumFor(rp('A', 0, 10))).toBeNull(); // nivel 2
  });

  it('proceso nuevo entra al nivel 0', () => {
    const algo = new MLFQ([2, 5]);
    algo.onEvent({ type: 'arrival', id: 'P1', tick: 0 });
    const selected = algo.select([rp('P1', 0, 5)]);
    expect(selected.id).toBe('P1');
    expect(algo.quantumFor(rp('P1', 0, 5))).toBe(2);
  });

  it('agota quantum en nivel 0 → message menciona nivel 1', () => {
    const algo = new MLFQ([2, 5]);
    algo.onEvent({ type: 'arrival', id: 'P1', tick: 0 });
    algo.onEvent({ type: 'dispatch', id: 'P1', tick: 0 });
    const msg = algo.onEvent({ type: 'quantum-expiry', id: 'P1', tick: 2 });
    expect(JSON.stringify(msg)).toMatch(/nivel 1/);
  });

  it('agota quantum en nivel 2 → permanece en nivel 2', () => {
    const algo = new MLFQ([2, 5]);
    algo.onEvent({ type: 'arrival', id: 'P1', tick: 0 });
    algo.onEvent({ type: 'dispatch', id: 'P1', tick: 0 });
    algo.onEvent({ type: 'quantum-expiry', id: 'P1', tick: 2 }); // →1
    algo.onEvent({ type: 'dispatch', id: 'P1', tick: 2 });
    algo.onEvent({ type: 'quantum-expiry', id: 'P1', tick: 7 }); // →2
    algo.onEvent({ type: 'dispatch', id: 'P1', tick: 7 });
    const msg = algo.onEvent({ type: 'quantum-expiry', id: 'P1', tick: 20 }); // sigue en 2
    expect(JSON.stringify(msg)).toMatch(/nivel 2/);
    expect(algo.quantumFor(rp('P1', 0, 20))).toBeNull();
  });

  it('proceso expropiado vuelve al nivel actual sin degradarse', () => {
    const algo = new MLFQ([2, 5]);
    algo.onEvent({ type: 'arrival', id: 'P1', tick: 0 });
    algo.onEvent({ type: 'dispatch', id: 'P1', tick: 0 });
    algo.onEvent({ type: 'quantum-expiry', id: 'P1', tick: 2 }); // P1 → nivel 1
    algo.onEvent({ type: 'arrival', id: 'P2', tick: 2 });
    algo.onEvent({ type: 'dispatch', id: 'P2', tick: 2 }); // P2 en CPU (nivel 0)
    algo.onEvent({ type: 'arrival', id: 'P3', tick: 3 }); // nueva llegada al nivel 0
    algo.onEvent({ type: 'preempted', id: 'P2', tick: 3 }); // P2 expropiado → vuelve a nivel 0
    // P2 no degradó: sigue en nivel 0
    expect(algo.quantumFor(rp('P2', 2, 5))).toBe(2);
  });

  it('llegada al nivel 0 expropia proceso en nivel inferior (integración)', () => {
    // P1 llega en t=0, P2 llega en t=3 después de que P1 se degradó al nivel 1
    const P1b: Process = { id: 'P1', arrival_time: 0, burst_time: 10 };
    const P2b: Process = { id: 'P2', arrival_time: 3, burst_time: 4 };
    const result = run([P1b, P2b], { algorithm: 'test-mlfq-exp' });
    // P2 debería ejecutarse antes de que P1 termine (expropiación)
    const intervals = result.intervals.filter((i) => i.pid !== null);
    const hasP2Early = intervals.some((i) => i.pid === 'P2' && i.start < 10);
    expect(hasP2Early).toBe(true);
  });

  it('priority-boost: todos los procesos suben al nivel 0', () => {
    const algo = new MLFQ([2, 5]);
    algo.onEvent({ type: 'arrival', id: 'P1', tick: 0 });
    algo.onEvent({ type: 'dispatch', id: 'P1', tick: 0 });
    algo.onEvent({ type: 'quantum-expiry', id: 'P1', tick: 2 }); // P1 → nivel 1
    algo.onEvent({ type: 'arrival', id: 'P2', tick: 2 });
    algo.onEvent({ type: 'dispatch', id: 'P2', tick: 2 }); // P2 en CPU (nivel 0)
    // P1 está en nivel 1 esperando
    const msg = algo.onEvent({ type: 'priority-boost', tick: 4 });
    expect(JSON.stringify(msg)).toMatch(/priority boost/);
    // Ahora P1 y P2 están en nivel 0
    expect(algo.quantumFor(rp('P1', 0, 10))).toBe(2);
    expect(algo.quantumFor(rp('P2', 2, 8))).toBe(2);
  });

  it('select con cola vacía lanza error', () => {
    const algo = new MLFQ([2, 5]);
    expect(() => algo.select([])).toThrow();
  });
});
