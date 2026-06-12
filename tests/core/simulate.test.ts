import { describe, it, expect } from 'vitest';
import { run } from '../../src/core/simulate.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';
import type { Process } from '../../src/core/types/process.js';

// ── Stubs de algoritmos ──────────────────────────────────────────────────────

// FCFS: primer elemento de la cola (ya ordenada por arrival_time → id)
const fcfs: IAlgorithm = {
  name: 'FCFS',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('cola vacía');
    return first;
  },
};

// SRTF: menor remaining
const srtf: IAlgorithm = {
  name: 'SRTF',
  preemptionMode: 'on-better',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const sorted = [...ready].sort((a, b) => a.remaining - b.remaining);
    const first = sorted[0];
    if (first === undefined) throw new Error('cola vacía');
    return first;
  },
};

// Round Robin: primer elemento de la cola FIFO
const rr: IAlgorithm = {
  name: 'RR',
  preemptionMode: 'on-quantum',
  requires: { quantum: true },
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('cola vacía');
    return first;
  },
};

// SJF: menor remaining (no expropiativo)
const sjf: IAlgorithm = {
  name: 'SJF',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const sorted = [...ready].sort((a, b) => a.remaining - b.remaining);
    const first = sorted[0];
    if (first === undefined) throw new Error('cola vacía');
    return first;
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function gantt(result: ReturnType<typeof run>): string {
  return result.intervals
    .map((iv) => `${iv.pid ?? 'Inactivo'}[${iv.start.toString()}-${iv.end.toString()}]`)
    .join(', ');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── T-07: CPU inactiva ────────────────────────────────────────────────────────

describe('T-07: CPU inactiva', () => {
  it('hueco al inicio con un único proceso que llega tarde (FCFS)', () => {
    const procs: Process[] = [{ id: 'P1', arrival_time: 2, burst_time: 2 }];
    const result = run(procs, fcfs);
    // CPU inactiva en [0-2], luego P1[2-4]
    expect(result.history[0]?.onCPU).toBeNull();
    expect(result.history[1]?.onCPU).toBeNull();
    expect(result.history[2]?.onCPU).toBe('P1');
    expect(gantt(result)).toBe('Inactivo[0-2], P1[2-4]');
  });

  it('mensaje "CPU inactiva" en ticks sin proceso', () => {
    const procs: Process[] = [{ id: 'P1', arrival_time: 4, burst_time: 3 }];
    const result = run(procs, fcfs);
    expect(result.history[0]?.message).toBe('CPU inactiva');
    expect(result.history[3]?.message).toBe('CPU inactiva');
    expect(gantt(result)).toBe('Inactivo[0-4], P1[4-7]');
  });
});

// ── T-08: Determinismo y desempate ───────────────────────────────────────────

describe('T-08: Determinismo y desempate', () => {
  it('dos ejecuciones del mismo escenario producen el mismo resultado', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
    ];
    const r1 = run(procs, fcfs);
    const r2 = run(procs, fcfs);
    expect(gantt(r1)).toBe(gantt(r2));
    expect(r1.history.length).toBe(r2.history.length);
  });

  it('desempate por id numérico: P1 antes que P2 (mismo arrival_time, mismo burst)', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 0, burst_time: 3 },
    ];
    const result = run(procs, sjf);
    expect(gantt(result)).toBe('P1[0-3], P2[3-6]');
  });

  it('desempate numérico: P2 antes que P10 si mismo arrival', () => {
    const procs: Process[] = [
      { id: 'P10', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 2 },
    ];
    const result = run(procs, fcfs);
    // P2 tiene id numérico 2, P10 tiene 10 → P2 primero
    expect(result.history[0]?.onCPU).toBe('P2');
  });
});

// ── T-09: Modo 'none' (no expropiativo) ─────────────────────────────────────

describe('T-09: Modo none (FCFS)', () => {
  it('FCFS caso 1: P1(0,3), P2(2,2), P3(1,4)', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
      { id: 'P3', arrival_time: 1, burst_time: 4 },
    ];
    const result = run(procs, fcfs);
    expect(gantt(result)).toBe('P1[0-3], P3[3-7], P2[7-9]');
  });

  it('FCFS caso 2: hueco entre P1 y P2', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 5, burst_time: 2 },
      { id: 'P3', arrival_time: 6, burst_time: 4 },
    ];
    const result = run(procs, fcfs);
    expect(gantt(result)).toBe('P1[0-3], Inactivo[3-5], P2[5-7], P3[7-11]');
  });

  it('no expropia: proceso en CPU no es sustituido aunque llegue uno con menos ráfaga', () => {
    // Con SJF no expropiativo: P1 en CPU hasta que termina
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 2 },
    ];
    const result = run(procs, sjf);
    // P1 ocupa CPU de 0 a 5 sin ser desalojado por P2
    expect(result.history[1]?.onCPU).toBe('P1');
    expect(result.history[4]?.onCPU).toBe('P1');
  });
});

// ── T-10: Modo 'on-better' (SRTF) ───────────────────────────────────────────

describe('T-10: Modo on-better (SRTF)', () => {
  it('SRTF caso 1: P1(0,8), P2(1,4), P3(2,2), P4(4,1)', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 8 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
      { id: 'P4', arrival_time: 4, burst_time: 1 },
    ];
    const result = run(procs, srtf);
    expect(gantt(result)).toBe('P1[0-1], P2[1-2], P3[2-4], P4[4-5], P2[5-8], P1[8-15]');
  });

  it('SRTF caso 2: hueco entre P1 y P2', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 4, burst_time: 3 },
      { id: 'P3', arrival_time: 5, burst_time: 1 },
    ];
    const result = run(procs, srtf);
    expect(gantt(result)).toBe('P1[0-2], Inactivo[2-4], P2[4-5], P3[5-6], P2[6-8]');
  });

  it('SRTF caso 3: múltiples huecos', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 2, burst_time: 2 },
      { id: 'P2', arrival_time: 6, burst_time: 4 },
      { id: 'P3', arrival_time: 12, burst_time: 2 },
    ];
    const result = run(procs, srtf);
    expect(gantt(result)).toBe(
      'Inactivo[0-2], P1[2-4], Inactivo[4-6], P2[6-10], Inactivo[10-12], P3[12-14]',
    );
  });
});

// ── T-11: Modo 'on-quantum' (Round Robin) ────────────────────────────────────

describe('T-11: Modo on-quantum (Round Robin)', () => {
  it('RR caso 1: P1(0,5), P2(1,4), P3(2,2), quantum=2', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
    ];
    const result = run(procs, rr, { quantum: 2 });
    expect(gantt(result)).toBe('P1[0-2], P2[2-4], P3[4-6], P1[6-8], P2[8-10], P1[10-11]');
  });

  it('RR caso 2: hueco con quantum=3', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 5, burst_time: 4 },
      { id: 'P3', arrival_time: 12, burst_time: 3 },
    ];
    const result = run(procs, rr, { quantum: 3 });
    expect(gantt(result)).toBe(
      'P1[0-2], Inactivo[2-5], P2[5-8], P2[8-9], Inactivo[9-12], P3[12-15]',
    );
  });

  it('RR caso 3: todos llegan en tick 0, quantum=1', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 0, burst_time: 2 },
      { id: 'P3', arrival_time: 0, burst_time: 1 },
    ];
    const result = run(procs, rr, { quantum: 1 });
    expect(gantt(result)).toBe('P1[0-1], P2[1-2], P3[2-3], P1[3-4], P2[4-5], P1[5-6]');
  });

  it('llegada coincide con quantum: el que llega entra antes que el reencolado', () => {
    // En tick 2 expira quantum de P1 Y llega P3: P3 antes que P1 en la cola
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
    ];
    const result = run(procs, rr, { quantum: 2 });
    // Después de P1[0-2], la cola debe ser [P2, P3, P1] → P2 ejecuta en tick 2
    expect(result.history[2]?.onCPU).toBe('P2');
  });
});

// ── T-12: deriveIntervals y deriveMetrics ────────────────────────────────────

describe('T-12: Derivación de intervals y metrics', () => {
  it('deriveIntervals colapsa ticks consecutivos del mismo pid', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
    ];
    const result = run(procs, fcfs);
    // P1 en ticks 0,1,2 → intervalo [0-3]; P2 en ticks 3,4 → [3-5]
    expect(result.intervals).toEqual([
      { pid: 'P1', start: 0, end: 3 },
      { pid: 'P2', start: 3, end: 5 },
    ]);
  });

  it('métricas FCFS caso 1: avg waiting 2.33, avg turnaround 5.33', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
      { id: 'P3', arrival_time: 1, burst_time: 4 },
    ];
    const result = run(procs, fcfs);
    expect(round2(result.metrics.aggregate.avgWaiting)).toBe(2.33);
    expect(round2(result.metrics.aggregate.avgTurnaround)).toBe(5.33);
  });

  it('métricas RR caso 1: avg waiting 4.33, avg turnaround 8.00', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
    ];
    const result = run(procs, rr, { quantum: 2 });
    expect(round2(result.metrics.aggregate.avgWaiting)).toBe(4.33);
    expect(round2(result.metrics.aggregate.avgTurnaround)).toBe(8.0);
  });

  it('deriveIntervals incluye huecos de inactividad como pid=null', () => {
    const procs: Process[] = [{ id: 'P1', arrival_time: 2, burst_time: 2 }];
    const result = run(procs, fcfs);
    expect(result.intervals[0]).toEqual({ pid: null, start: 0, end: 2 });
    expect(result.intervals[1]).toEqual({ pid: 'P1', start: 2, end: 4 });
  });

  it('métricas FCFS caso 2: avg waiting 0.33, avg turnaround 3.33', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 5, burst_time: 2 },
      { id: 'P3', arrival_time: 6, burst_time: 4 },
    ];
    const result = run(procs, fcfs);
    expect(round2(result.metrics.aggregate.avgWaiting)).toBe(0.33);
    expect(round2(result.metrics.aggregate.avgTurnaround)).toBe(3.33);
  });
});

// ── T-13: Coherencia del history ─────────────────────────────────────────────

describe('T-13: Coherencia del history', () => {
  it('completed crece monotónicamente tick a tick', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
      { id: 'P3', arrival_time: 1, burst_time: 4 },
    ];
    const result = run(procs, fcfs);
    let prev = 0;
    for (const event of result.history) {
      expect(event.completed.length).toBeGreaterThanOrEqual(prev);
      prev = event.completed.length;
    }
  });

  it('en tick 0 completed está vacío (ningún proceso puede terminar antes de ejecutarse)', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
    ];
    const result = run(procs, fcfs);
    expect(result.history[0]?.completed).toEqual([]);
  });

  it('en el último tick completed contiene todos los procesos', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
    ];
    const result = run(procs, fcfs);
    const last = result.history[result.history.length - 1];
    expect(last?.completed).toContain('P1');
    expect(last?.completed).toContain('P2');
  });

  it('onCPU no aparece en ready en el mismo tick', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 1, burst_time: 2 },
    ];
    const result = run(procs, fcfs);
    for (const event of result.history) {
      if (event.onCPU !== null) {
        expect(event.ready).not.toContain(event.onCPU);
      }
    }
  });

  it('SRTF: finalización en el tick correcto', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 8 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
      { id: 'P4', arrival_time: 4, burst_time: 1 },
    ];
    const result = run(procs, srtf);
    // P3 finaliza en tick 3 (completion = 4), P4 en tick 4 (completion = 5), P2 en tick 7 (comp=8), P1 en tick 14 (comp=15)
    const p3 = result.metrics.processes.find((m) => m.id === 'P3');
    const p4 = result.metrics.processes.find((m) => m.id === 'P4');
    const p2 = result.metrics.processes.find((m) => m.id === 'P2');
    const p1 = result.metrics.processes.find((m) => m.id === 'P1');
    expect(p3?.completion).toBe(4);
    expect(p4?.completion).toBe(5);
    expect(p2?.completion).toBe(8);
    expect(p1?.completion).toBe(15);
  });
});

// ── T-14: Casos límite ───────────────────────────────────────────────────────

describe('T-14: Casos límite', () => {
  it('sin procesos: devuelve history vacío sin error', () => {
    const result = run([], fcfs);
    expect(result.history).toHaveLength(0);
    expect(result.intervals).toHaveLength(0);
    expect(result.metrics.processes).toHaveLength(0);
  });

  it('burst_time = 0: lanza error con el mensaje correcto', () => {
    const procs: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 0 }];
    expect(() => run(procs, fcfs)).toThrow('La ráfaga debe ser mayor que 0');
  });

  it('burst_time negativo: lanza error', () => {
    const procs: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: -1 }];
    expect(() => run(procs, fcfs)).toThrow('La ráfaga debe ser mayor que 0');
  });
});

// ── T-15: Aislamiento de dependencias (Node) ─────────────────────────────────

describe('T-15: Aislamiento de dependencias (Node)', () => {
  it('run() se puede importar y ejecutar en Node sin React ni DOM', () => {
    // Este test ya está en entorno Node (tests/core → node en vitest.config)
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 1, burst_time: 2 },
    ];
    const result = run(procs, fcfs);
    expect(result).toBeDefined();
  });

  it('SimulationResult contiene history, intervals y metrics con al menos un elemento', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
    ];
    const result = run(procs, fcfs);
    expect(result.history.length).toBeGreaterThan(0);
    expect(result.intervals.length).toBeGreaterThan(0);
    expect(result.metrics.processes.length).toBeGreaterThan(0);
  });
});
