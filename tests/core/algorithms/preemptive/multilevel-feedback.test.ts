import { describe, it, expect } from 'vitest';
import { MLFQ } from '../../../../src/core/algorithms/preemptive/multilevel-feedback.js';
import { run } from '../../../../src/core/simulate.js';
import { register } from '../../../../src/core/registry.js';
import type { Process } from '../../../../src/core/types/process.js';

// Registrar fábricas de prueba con nombre único
register(() => new MLFQ([2, 10], 'test-mlfq-2-10'));
register(() => new MLFQ([2, 10], 'test-mlfq-2-10-b6'));
register(() => new MLFQ([2, 5], 'test-mlfq-2-5'));
register(() => new MLFQ([2, 5], 'test-mlfq-exp'));
register(() => new MLFQ([2, 2], 'test-mlfq-rtc'));

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

  it('el proceso que CONTINÚA en CPU indica su cola de prioridad (no solo "P1 en CPU")', () => {
    // tick 1: P1 sigue en CPU en la cola de prioridad 0 (recién despachado en t=0)
    expect(result.history[1]?.message).toMatch(/P1 en CPU de la cola de prioridad 0/);
    // tick 5: P1 sigue en CPU ya degradado, en la cola de prioridad 1
    expect(result.history[5]?.message).toMatch(/P1 en CPU de la cola de prioridad 1/);
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
  it('hay exactamente 3 niveles: nivel 0 (q=quanta[0]), nivel 1 (q=quanta[1]), nivel 2 (FCFS sin expiración)', () => {
    const algo = new MLFQ([3, 7]);
    algo.onEvent({ type: 'arrival', id: 'A', tick: 0 });
    algo.onEvent({ type: 'dispatch', id: 'A', tick: 0 });
    expect(algo.quantumFor(rp('A', 0, 10))).toBe(3); // nivel 0

    algo.onEvent({ type: 'quantum-expiry', id: 'A', tick: 3 }); // →1
    algo.onEvent({ type: 'dispatch', id: 'A', tick: 3 });
    expect(algo.quantumFor(rp('A', 0, 10))).toBe(7); // nivel 1

    algo.onEvent({ type: 'quantum-expiry', id: 'A', tick: 10 }); // →2
    algo.onEvent({ type: 'dispatch', id: 'A', tick: 10 });
    // nivel 2: run-to-completion → quantumFor devuelve 0 (sin expiración de quantum)
    expect(algo.quantumFor(rp('A', 0, 10))).toBe(0);
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
    expect(algo.quantumFor(rp('P1', 0, 20))).toBe(0); // nivel 2: sin expiración (run-to-completion)
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

  it('una llegada NO expropia: el proceso en CPU agota su quantum primero (integración)', () => {
    // P1 (burst 10) corre nivel 0 [0-2] y nivel 1 [2-7]. P2 llega en t=3 pero NO expropia:
    // espera en nivel 0 y solo arranca cuando P1 agota su quantum de nivel 1 (t=7).
    const P1b: Process = { id: 'P1', arrival_time: 0, burst_time: 10 };
    const P2b: Process = { id: 'P2', arrival_time: 3, burst_time: 4 };
    const result = run([P1b, P2b], { algorithm: 'test-mlfq-exp' });
    const intervals = result.intervals.filter((i) => i.pid !== null);
    // P1 ocupa la CPU de forma continua [0-7] (no es expropiado por la llegada de P2 en t=3)
    const firstP1 = intervals.find((i) => i.pid === 'P1');
    expect(firstP1?.start).toBe(0);
    expect(firstP1?.end).toBe(7);
    // P2 no arranca hasta t=7 (espera a que P1 agote su quantum, sin expropiar)
    const firstP2 = intervals.find((i) => i.pid === 'P2');
    expect(firstP2?.start).toBe(7);
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

  it('nivel 2 es run-to-completion: una llegada al nivel 0 NO lo expropia', () => {
    // P1 burst 8, quanta [2,2] → P1: nivel0 [0-2], nivel1 [2-4], nivel2 desde t=4.
    // P2 llega en t=5 al nivel 0 mientras P1 corre en nivel 2.
    const P1c: Process = { id: 'P1', arrival_time: 0, burst_time: 8 };
    const P2c: Process = { id: 'P2', arrival_time: 5, burst_time: 2 };
    const result = run([P1c, P2c], { algorithm: 'test-mlfq-rtc' });
    const intervals = result.intervals.filter((i) => i.pid !== null);
    // P1 (en nivel 2 desde t=4) corre sin interrupción hasta completar en t=8;
    // P2 no puede arrancar hasta entonces.
    const p1Completion = result.metrics.perProcess.find((m) => m.id === 'P1')?.completion;
    expect(p1Completion).toBe(8);
    const firstP2 = intervals.find((i) => i.pid === 'P2');
    expect(firstP2?.start).toBe(8);
  });

  it('select con cola vacía lanza error', () => {
    const algo = new MLFQ([2, 5]);
    expect(() => algo.select([])).toThrow();
  });

  it('select sin colas pobladas cae al primero de la lista (fallback del motor)', () => {
    const algo = new MLFQ([2, 4]);
    // Sin eventos de arrival las colas de nivel están vacías → fallback a ready[0]
    expect(algo.select([rp('X', 0, 5), rp('Y', 1, 3)]).id).toBe('X');
  });

  it('onEvent ignora eventos no manejados (io-start) devolviendo null', () => {
    const algo = new MLFQ([2, 4]);
    expect(algo.onEvent({ type: 'io-start', id: 'P1', tick: 0 })).toBeNull();
  });

  it('priority-boost: el proceso en CPU en nivel 2 conserva su nivel (run-to-completion)', () => {
    const algo = new MLFQ([2, 2]);
    algo.onEvent({ type: 'arrival', id: 'P1', tick: 0 });
    algo.onEvent({ type: 'dispatch', id: 'P1', tick: 0 });
    algo.onEvent({ type: 'quantum-expiry', id: 'P1', tick: 2 }); // → nivel 1
    algo.onEvent({ type: 'dispatch', id: 'P1', tick: 2 });
    algo.onEvent({ type: 'quantum-expiry', id: 'P1', tick: 4 }); // → nivel 2
    algo.onEvent({ type: 'dispatch', id: 'P1', tick: 4 }); // P1 en CPU, nivel 2
    algo.onEvent({ type: 'arrival', id: 'P2', tick: 5 }); // P2 al nivel 0
    algo.onEvent({ type: 'priority-boost', tick: 6 });
    // P1 (nivel 2, run-to-completion) NO sube; P2 sí está en nivel 0
    expect(algo.quantumFor(rp('P1', 0, 8))).toBe(0); // nivel 2 → 0
    expect(algo.quantumFor(rp('P2', 5, 4))).toBe(2); // nivel 0 → quanta[0]
  });
});
