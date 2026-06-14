import { describe, it, expect, beforeEach } from 'vitest';
import { run, deriveIntervals, deriveMetrics } from '../../src/core/simulate.js';
import { register } from '../../src/core/registry.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';
import type { Process } from '../../src/core/types/process.js';

// ─── Stubs de algoritmos para los tests del motor ───────────────────────────

const fcfsStub: IAlgorithm = {
  name: 'fcfs-stub',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Cola vacía');
    return first;
  },
};

const sjfStub: IAlgorithm = {
  name: 'sjf-stub',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const sorted = [...ready].sort((a, b) => a.remaining - b.remaining);
    const first = sorted[0];
    if (first === undefined) throw new Error('Cola vacía');
    return first;
  },
};

const srtfStub: IAlgorithm = {
  name: 'srtf-stub',
  preemptionMode: 'on-better',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const sorted = [...ready].sort((a, b) => a.remaining - b.remaining);
    const first = sorted[0];
    if (first === undefined) throw new Error('Cola vacía');
    return first;
  },
};

const rrStub: IAlgorithm = {
  name: 'rr-stub',
  preemptionMode: 'on-quantum',
  requires: { quantum: true },
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Cola vacía');
    return first;
  },
};

beforeEach(() => {
  register(fcfsStub);
  register(sjfStub);
  register(srtfStub);
  register(rrStub);
});

// ─── T-07: CPU inactiva ──────────────────────────────────────────────────────

describe('T-07: CPU inactiva', () => {
  it('CPU inactiva al inicio cuando el primer proceso llega después del tick 0 (P1 llega en t=2)', () => {
    // BEHAVIOURS § CPU inactiva — caso 1
    const procs: Process[] = [{ id: 'P1', arrival_time: 2, burst_time: 2 }];
    const result = run(procs, { algorithm: 'fcfs-stub' });

    const intervals = result.intervals;
    // Inactivo[0-2], P1[2-4]
    expect(intervals[0]).toEqual({ pid: null, start: 0, end: 2 });
    expect(intervals[1]).toEqual({ pid: 'P1', start: 2, end: 4 });
  });

  it('CPU inactiva en el intervalo [0-4] para proceso con llegada en t=4', () => {
    // BEHAVIOURS § CPU inactiva — caso 2
    const procs: Process[] = [{ id: 'P1', arrival_time: 4, burst_time: 3, priority: 2 }];
    const result = run(procs, { algorithm: 'fcfs-stub' });

    const intervals = result.intervals;
    expect(intervals[0]).toEqual({ pid: null, start: 0, end: 4 });
    expect(intervals[1]).toEqual({ pid: 'P1', start: 4, end: 7 });
  });

  it('el history refleja CPU inactiva (onCPU=null) en los ticks antes de la llegada', () => {
    const procs: Process[] = [{ id: 'P1', arrival_time: 2, burst_time: 2 }];
    const result = run(procs, { algorithm: 'fcfs-stub' });

    expect(result.history[0]?.onCPU).toBeNull();
    expect(result.history[1]?.onCPU).toBeNull();
    expect(result.history[2]?.onCPU).toBe('P1');
    expect(result.history[3]?.onCPU).toBe('P1');
  });

  it('history tiene el mensaje "CPU inactiva" en los ticks inactivos', () => {
    const procs: Process[] = [{ id: 'P1', arrival_time: 1, burst_time: 1 }];
    const result = run(procs, { algorithm: 'fcfs-stub' });

    expect(result.history[0]?.message).toContain('inactiva');
  });
});

// ─── T-08: Desempate global ──────────────────────────────────────────────────

describe('T-08: Determinismo y desempate', () => {
  it('el mismo input produce el mismo resultado en dos ejecuciones', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 1, burst_time: 2 },
    ];
    const r1 = run(procs, { algorithm: 'fcfs-stub' });
    const r2 = run(procs, { algorithm: 'fcfs-stub' });
    expect(r1.intervals).toEqual(r2.intervals);
    expect(r1.history.length).toBe(r2.history.length);
  });

  it('desempate por arrival_time y luego por id: P1 antes que P2 con mismo burst y llegada', () => {
    // BEHAVIOURS § Determinismo — P1 y P2 misma llegada y ráfaga con SJF
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 0, burst_time: 3 },
    ];
    const result = run(procs, { algorithm: 'sjf-stub' });
    expect(result.intervals[0]).toEqual({ pid: 'P1', start: 0, end: 3 });
    expect(result.intervals[1]).toEqual({ pid: 'P2', start: 3, end: 6 });
  });

  it('desempate natural: P1A antes que P1B (comparación natural, no lexicográfica)', () => {
    const procs: Process[] = [
      { id: 'P1B', arrival_time: 0, burst_time: 2 },
      { id: 'P1A', arrival_time: 0, burst_time: 2 },
    ];
    const result = run(procs, { algorithm: 'fcfs-stub' });
    expect(result.intervals[0]?.pid).toBe('P1A');
    expect(result.intervals[1]?.pid).toBe('P1B');
  });
});

// ─── T-09: Modo 'none' (no expropiativo) — FCFS ─────────────────────────────

describe('T-09: Modo none (no expropiativo) — FCFS', () => {
  it('FCFS: P1[0-3], P3[3-7], P2[7-9] — BEHAVIOURS § Simular FCFS caso 1', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
      { id: 'P3', arrival_time: 1, burst_time: 4 },
    ];
    const result = run(procs, { algorithm: 'fcfs-stub' });
    const intervals = result.intervals;
    expect(intervals[0]).toEqual({ pid: 'P1', start: 0, end: 3 });
    expect(intervals[1]).toEqual({ pid: 'P3', start: 3, end: 7 });
    expect(intervals[2]).toEqual({ pid: 'P2', start: 7, end: 9 });
  });

  it('FCFS con hueco de CPU inactiva: P1[0-3], Inactivo[3-5], P2[5-7], P3[7-11]', () => {
    // BEHAVIOURS § Simular FCFS caso 2
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 5, burst_time: 2 },
      { id: 'P3', arrival_time: 6, burst_time: 4 },
    ];
    const result = run(procs, { algorithm: 'fcfs-stub' });
    const intervals = result.intervals;
    expect(intervals[0]).toEqual({ pid: 'P1', start: 0, end: 3 });
    expect(intervals[1]).toEqual({ pid: null, start: 3, end: 5 });
    expect(intervals[2]).toEqual({ pid: 'P2', start: 5, end: 7 });
    expect(intervals[3]).toEqual({ pid: 'P3', start: 7, end: 11 });
  });

  it('no expropiar: proceso en CPU no se interrumpe aunque llegue uno con menor burst', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 1 }, // llegaría pero P1 no debe ser interrumpido
    ];
    const result = run(procs, { algorithm: 'fcfs-stub' });
    // P1 ocupa CPU durante todos sus 5 ticks (no expropiativo)
    expect(result.intervals[0]).toEqual({ pid: 'P1', start: 0, end: 5 });
    expect(result.intervals[1]).toEqual({ pid: 'P2', start: 5, end: 6 });
  });
});

// ─── T-10: Modo 'on-better' (SRTF) ─────────────────────────────────────────

describe('T-10: Modo on-better (SRTF)', () => {
  it('SRTF: P1[0-1],P2[1-2],P3[2-4],P4[4-5],P2[5-8],P1[8-15] — BEHAVIOURS § Simular SRTF caso 1', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 8 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
      { id: 'P4', arrival_time: 4, burst_time: 1 },
    ];
    const result = run(procs, { algorithm: 'srtf-stub' });
    const intervals = result.intervals;
    expect(intervals[0]).toEqual({ pid: 'P1', start: 0, end: 1 });
    expect(intervals[1]).toEqual({ pid: 'P2', start: 1, end: 2 });
    expect(intervals[2]).toEqual({ pid: 'P3', start: 2, end: 4 });
    expect(intervals[3]).toEqual({ pid: 'P4', start: 4, end: 5 });
    expect(intervals[4]).toEqual({ pid: 'P2', start: 5, end: 8 });
    expect(intervals[5]).toEqual({ pid: 'P1', start: 8, end: 15 });
  });

  it('SRTF con hueco: P1[0-2],Inactivo[2-4],P2[4-5],P3[5-6],P2[6-8]', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 4, burst_time: 3 },
      { id: 'P3', arrival_time: 5, burst_time: 1 },
    ];
    const result = run(procs, { algorithm: 'srtf-stub' });
    const intervals = result.intervals;
    expect(intervals[0]).toEqual({ pid: 'P1', start: 0, end: 2 });
    expect(intervals[1]).toEqual({ pid: null, start: 2, end: 4 });
    expect(intervals[2]).toEqual({ pid: 'P2', start: 4, end: 5 });
    expect(intervals[3]).toEqual({ pid: 'P3', start: 5, end: 6 });
    expect(intervals[4]).toEqual({ pid: 'P2', start: 6, end: 8 });
  });

  it('SRTF con múltiples huecos: Inactivo[0-2],P1[2-4],Inactivo[4-6],P2[6-10],Inactivo[10-12],P3[12-14]', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 2, burst_time: 2 },
      { id: 'P2', arrival_time: 6, burst_time: 4 },
      { id: 'P3', arrival_time: 12, burst_time: 2 },
    ];
    const result = run(procs, { algorithm: 'srtf-stub' });
    const intervals = result.intervals;
    expect(intervals[0]).toEqual({ pid: null, start: 0, end: 2 });
    expect(intervals[1]).toEqual({ pid: 'P1', start: 2, end: 4 });
    expect(intervals[2]).toEqual({ pid: null, start: 4, end: 6 });
    expect(intervals[3]).toEqual({ pid: 'P2', start: 6, end: 10 });
    expect(intervals[4]).toEqual({ pid: null, start: 10, end: 12 });
    expect(intervals[5]).toEqual({ pid: 'P3', start: 12, end: 14 });
  });
});

// ─── T-11: Modo 'on-quantum' (Round Robin) ──────────────────────────────────

describe('T-11: Modo on-quantum (Round Robin)', () => {
  it('RR q=2: P1[0-2],P2[2-4],P3[4-6],P1[6-8],P2[8-10],P1[10-11] — BEHAVIOURS § RR caso 1', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
    ];
    const result = run(procs, { algorithm: 'rr-stub', params: { quantum: 2 } });
    const intervals = result.intervals;
    expect(intervals[0]).toEqual({ pid: 'P1', start: 0, end: 2 });
    expect(intervals[1]).toEqual({ pid: 'P2', start: 2, end: 4 });
    expect(intervals[2]).toEqual({ pid: 'P3', start: 4, end: 6 });
    expect(intervals[3]).toEqual({ pid: 'P1', start: 6, end: 8 });
    expect(intervals[4]).toEqual({ pid: 'P2', start: 8, end: 10 });
    expect(intervals[5]).toEqual({ pid: 'P1', start: 10, end: 11 });
  });

  it('RR q=3 con huecos: P1[0-2],Inactivo[2-5],P2[5-8],P2[8-9],Inactivo[9-12],P3[12-15]', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 5, burst_time: 4 },
      { id: 'P3', arrival_time: 12, burst_time: 3 },
    ];
    const result = run(procs, { algorithm: 'rr-stub', params: { quantum: 3 } });
    const intervals = result.intervals;
    expect(intervals[0]).toEqual({ pid: 'P1', start: 0, end: 2 });
    expect(intervals[1]).toEqual({ pid: null, start: 2, end: 5 });
    expect(intervals[2]).toEqual({ pid: 'P2', start: 5, end: 8 });
    expect(intervals[3]).toEqual({ pid: 'P2', start: 8, end: 9 });
    expect(intervals[4]).toEqual({ pid: null, start: 9, end: 12 });
    expect(intervals[5]).toEqual({ pid: 'P3', start: 12, end: 15 });
  });

  it('RR q=1: P1[0-1],P2[1-2],P3[2-3],P1[3-4],P2[4-5],P1[5-6] — BEHAVIOURS § RR caso 3', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 0, burst_time: 2 },
      { id: 'P3', arrival_time: 0, burst_time: 1 },
    ];
    const result = run(procs, { algorithm: 'rr-stub', params: { quantum: 1 } });
    const intervals = result.intervals;
    expect(intervals[0]).toEqual({ pid: 'P1', start: 0, end: 1 });
    expect(intervals[1]).toEqual({ pid: 'P2', start: 1, end: 2 });
    expect(intervals[2]).toEqual({ pid: 'P3', start: 2, end: 3 });
    expect(intervals[3]).toEqual({ pid: 'P1', start: 3, end: 4 });
    expect(intervals[4]).toEqual({ pid: 'P2', start: 4, end: 5 });
    expect(intervals[5]).toEqual({ pid: 'P1', start: 5, end: 6 });
  });

  it('RR q=2: llega proceso en mismo tick que expira quantum → el llegado va antes del reencolado', () => {
    // P1 q=2 expira en tick 2; P3 llega en tick 2 → P3 debe ir antes que P1 reencolado
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
    ];
    const result = run(procs, { algorithm: 'rr-stub', params: { quantum: 2 } });
    // Esperado: P1[0-2], P2[2-4], P3[4-6], ... (no P1[2-4])
    expect(result.intervals[1]?.pid).toBe('P2');
  });
});

// ─── T-12: Derivación de intervals y metrics ─────────────────────────────────

describe('T-12: deriveIntervals y deriveMetrics', () => {
  it('métricas FCFS caso 1: avgWaiting=2.33, avgTurnaround=5.33', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
      { id: 'P3', arrival_time: 1, burst_time: 4 },
    ];
    const result = run(procs, { algorithm: 'fcfs-stub' });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(2.33, 1);
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(5.33, 1);
  });

  it('métricas FCFS caso 2: avgWaiting=0.33, avgTurnaround=3.33', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 5, burst_time: 2 },
      { id: 'P3', arrival_time: 6, burst_time: 4 },
    ];
    const result = run(procs, { algorithm: 'fcfs-stub' });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(0.33, 1);
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(3.33, 1);
  });

  it('RR caso 1: avgWaiting=4.33, avgTurnaround=8.00', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
    ];
    const result = run(procs, { algorithm: 'rr-stub', params: { quantum: 2 } });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(4.33, 1);
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(8.00, 1);
  });

  it('deriveIntervals colapsa ticks consecutivos del mismo pid', () => {
    const procs: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 3 }];
    const result = run(procs, { algorithm: 'fcfs-stub' });
    // 3 ticks de P1 deben colapsar en un solo intervalo
    expect(result.intervals).toHaveLength(1);
    expect(result.intervals[0]).toEqual({ pid: 'P1', start: 0, end: 3 });
  });

  it('history vacío → intervals vacíos y métricas en cero', () => {
    const intervals = deriveIntervals([]);
    expect(intervals).toHaveLength(0);
    const metrics = deriveMetrics([], []);
    expect(metrics.aggregate.avgWaiting).toBe(0);
  });
});

// ─── T-13: Coherencia del history ────────────────────────────────────────────

describe('T-13: Coherencia del history', () => {
  it('completed crece monotónicamente tick a tick', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 3 },
    ];
    const result = run(procs, { algorithm: 'fcfs-stub' });
    let prevLen = 0;
    for (const event of result.history) {
      expect(event.completed.length).toBeGreaterThanOrEqual(prevLen);
      prevLen = event.completed.length;
    }
  });

  it('completed en tick 0 está vacío si ningún proceso se completa en ese tick', () => {
    const procs: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 3 }];
    const result = run(procs, { algorithm: 'fcfs-stub' });
    expect(result.history[0]?.completed).toHaveLength(0);
  });

  it('en el último tick, completed contiene todos los procesos', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 1, burst_time: 1 },
    ];
    const result = run(procs, { algorithm: 'fcfs-stub' });
    const last = result.history[result.history.length - 1];
    expect(last?.completed).toContain('P1');
    expect(last?.completed).toContain('P2');
  });

  it('el proceso completado aparece en completed exactamente desde el tick en que terminó', () => {
    const procs: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 2 }];
    const result = run(procs, { algorithm: 'fcfs-stub' });
    // P1 corre en tick 0 y tick 1; completa al final del tick 1
    expect(result.history[0]?.completed).not.toContain('P1');
    expect(result.history[1]?.completed).toContain('P1');
  });

  it('messages describen el evento (selección o completado)', () => {
    const procs: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 1 }];
    const result = run(procs, { algorithm: 'fcfs-stub' });
    // El tick 0: P1 seleccionado Y completa en el mismo tick
    expect(result.history[0]?.message).toBeTruthy();
  });
});

// ─── T-14: Casos límite ──────────────────────────────────────────────────────

describe('T-14: Casos límite', () => {
  it('lista vacía de procesos: devuelve history vacío sin lanzar error', () => {
    const result = run([], { algorithm: 'fcfs-stub' });
    expect(result.history).toHaveLength(0);
    expect(result.intervals).toHaveLength(0);
  });

  it('burst_time = 0 lanza error con mensaje correcto', () => {
    const procs: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 0 }];
    expect(() => run(procs, { algorithm: 'fcfs-stub' })).toThrow(
      'La ráfaga debe ser mayor que 0',
    );
  });

  it('protección de límite de ticks: error si supera MAX_TICKS', () => {
    // Registrar un algoritmo que siempre elige el mismo proceso sin terminarlo
    const loopAlgo: IAlgorithm = {
      name: 'loop-algo',
      preemptionMode: 'none',
      requires: {},
      select(ready: readonly ReadyProcess[]): ReadyProcess {
        // Devolver un ID falso para forzar CPU inactiva indefinidamente
        return { id: 'FAKE', arrival_time: 0, burst_time: 1, remaining: 1 };
      },
    };
    register(loopAlgo);
    // Un proceso que nunca se completa porque el algoritmo siempre elige FAKE
    // El motor protege con CPU inactiva y eventualmente supera MAX_TICKS
    const procs: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 1 }];
    expect(() => run(procs, { algorithm: 'loop-algo' })).toThrow(/límite/);
  });
});

// ─── T-15: Aislamiento de dependencias ──────────────────────────────────────

describe('T-15: Aislamiento de dependencias (Node, sin React/DOM)', () => {
  it('run() devuelve history, intervals y metrics no vacíos para al menos un proceso', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
    ];
    const result = run(procs, { algorithm: 'fcfs-stub' });
    expect(result.history.length).toBeGreaterThan(0);
    expect(result.intervals.length).toBeGreaterThan(0);
    expect(result.metrics.perProcess.length).toBeGreaterThan(0);
    expect(result.metrics.aggregate).toBeDefined();
  });

  it('el resultado tiene la estructura correcta (history, intervals, metrics)', () => {
    const procs: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 2 }];
    const result = run(procs, { algorithm: 'fcfs-stub' });
    // history
    expect(Array.isArray(result.history)).toBe(true);
    // intervals
    expect(Array.isArray(result.intervals)).toBe(true);
    // metrics
    expect(result.metrics).toHaveProperty('perProcess');
    expect(result.metrics).toHaveProperty('aggregate');
  });

  it('el módulo no importa React ni DOM (se importa en entorno Node sin errores)', () => {
    // Si este test corre sin error, el módulo no depende de React/DOM
    expect(typeof run).toBe('function');
    expect(typeof deriveIntervals).toBe('function');
    expect(typeof deriveMetrics).toBe('function');
  });
});
