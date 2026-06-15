import { describe, it, expect } from 'vitest';
import { run, deriveMetrics } from '../../src/core/simulate.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';
import type { Process } from '../../src/core/types/process.js';

// ── Stubs de algoritmos para las pruebas del motor ───────────────────────────

// FCFS stub: devuelve el primero de la lista ya ordenada
const fcfsAlgo: IAlgorithm = {
  name: 'fcfs-test',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Cola vacía');
    return first;
  },
};

// SJF stub: menor remaining
const sjfAlgo: IAlgorithm = {
  name: 'sjf-test',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    let best = ready[0];
    if (best === undefined) throw new Error('Cola vacía');
    for (const p of ready) {
      if (p.remaining < best.remaining) best = p;
    }
    return best;
  },
};

// SRTF stub: menor remaining (expropiativo)
const srtfAlgo: IAlgorithm = {
  name: 'srtf-test',
  preemptionMode: 'on-better',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    let best = ready[0];
    if (best === undefined) throw new Error('Cola vacía');
    for (const p of ready) {
      if (p.remaining < best.remaining) best = p;
    }
    return best;
  },
};

// Round Robin stub: FIFO (primer elemento)
const rrAlgo: IAlgorithm = {
  name: 'rr-test',
  preemptionMode: 'on-quantum',
  requires: { quantum: true },
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Cola vacía');
    return first;
  },
};

// Prioridad NP stub: menor priority (Infinity si undefined)
const priorityNpAlgo: IAlgorithm = {
  name: 'priority-np-test',
  preemptionMode: 'none',
  requires: { priority: true },
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    let best = ready[0];
    if (best === undefined) throw new Error('Cola vacía');
    for (const p of ready) {
      if ((p.priority ?? Infinity) < (best.priority ?? Infinity)) best = p;
    }
    return best;
  },
};

// Helper: extrae los intervalos como strings "pid[start-end]"
function intervalStr(result: ReturnType<typeof run>): string[] {
  return result.intervals.map((i) => `${i.pid ?? 'null'}[${String(i.start)}-${String(i.end)}]`);
}

// Helper: redondea a 2 decimales
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── T-07 · CPU inactiva ──────────────────────────────────────────────────────

describe('T-07 · CPU inactiva', () => {
  it('P1(llegada 2, ráfaga 2) con FCFS → Inactivo[0-2], P1[2-4]', () => {
    const processes: Process[] = [{ id: 'P1', arrival_time: 2, burst_time: 2 }];
    const result = run(processes, { algorithm: fcfsAlgo });
    expect(intervalStr(result)).toEqual(['null[0-2]', 'P1[2-4]']);
  });

  it('P1(llegada 4, ráfaga 3) con Prioridad NP → Inactivo[0-4], P1[4-7]', () => {
    const processes: Process[] = [{ id: 'P1', arrival_time: 4, burst_time: 3, priority: 2 }];
    const result = run(processes, { algorithm: priorityNpAlgo });
    expect(intervalStr(result)).toEqual(['null[0-4]', 'P1[4-7]']);
  });

  it('eventos de CPU inactiva tienen onCPU = null y mensaje "CPU inactiva"', () => {
    const processes: Process[] = [{ id: 'P1', arrival_time: 2, burst_time: 1 }];
    const result = run(processes, { algorithm: fcfsAlgo });
    const idleEvents = result.history.filter((e) => e.onCPU === null && e.tick < 2);
    expect(idleEvents.length).toBe(2);
    expect(idleEvents.every((e) => e.message === 'CPU inactiva')).toBe(true);
  });
});

// ── T-08 · Desempate global ──────────────────────────────────────────────────

describe('T-08 · Desempate', () => {
  it('P1(0,3) y P2(0,3) con SJF → P1[0-3], P2[3-6] (desempate por id)', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 0, burst_time: 3 },
    ];
    const result = run(processes, { algorithm: sjfAlgo });
    expect(intervalStr(result)).toEqual(['P1[0-3]', 'P2[3-6]']);
  });

  it('P1B y P1A con mismo arrival/burst → P1A antes que P1B (orden natural)', () => {
    const processes: Process[] = [
      { id: 'P1B', arrival_time: 0, burst_time: 2 },
      { id: 'P1A', arrival_time: 0, burst_time: 2 },
    ];
    const result = run(processes, { algorithm: sjfAlgo });
    expect(intervalStr(result)).toEqual(['P1A[0-2]', 'P1B[2-4]']);
  });

  it('determinismo: misma simulación dos veces produce resultados idénticos', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
      { id: 'P3', arrival_time: 1, burst_time: 4 },
    ];
    const r1 = run(processes, { algorithm: fcfsAlgo });
    const r2 = run(processes, { algorithm: fcfsAlgo });
    expect(r1.history).toEqual(r2.history);
    expect(r1.intervals).toEqual(r2.intervals);
  });
});

// ── T-09 · Modo 'none' (FCFS) ───────────────────────────────────────────────

describe('T-09 · FCFS (no expropiativo)', () => {
  it('P1(0,3),P2(2,2),P3(1,4) → P1[0-3],P3[3-7],P2[7-9]', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
      { id: 'P3', arrival_time: 1, burst_time: 4 },
    ];
    const result = run(processes, { algorithm: fcfsAlgo });
    expect(intervalStr(result)).toEqual(['P1[0-3]', 'P3[3-7]', 'P2[7-9]']);
    expect(r2(result.metrics.aggregate.avgWaiting)).toBe(2.33);
    expect(r2(result.metrics.aggregate.avgTurnaround)).toBe(5.33);
  });

  it('P1(0,3),P2(5,2),P3(6,4) → P1[0-3],null[3-5],P2[5-7],P3[7-11]; avgWaiting=0.33', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 5, burst_time: 2 },
      { id: 'P3', arrival_time: 6, burst_time: 4 },
    ];
    const result = run(processes, { algorithm: fcfsAlgo });
    expect(intervalStr(result)).toEqual(['P1[0-3]', 'null[3-5]', 'P2[5-7]', 'P3[7-11]']);
    expect(r2(result.metrics.aggregate.avgWaiting)).toBe(0.33);
    expect(r2(result.metrics.aggregate.avgTurnaround)).toBe(3.33);
  });
});

// ── T-10 · Modo 'on-better' (SRTF) ──────────────────────────────────────────

describe('T-10 · SRTF (on-better)', () => {
  it('P1(0,8),P2(1,4),P3(2,2),P4(4,1) → diagrama SRTF correcto', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 8 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
      { id: 'P4', arrival_time: 4, burst_time: 1 },
    ];
    const result = run(processes, { algorithm: srtfAlgo });
    expect(intervalStr(result)).toEqual([
      'P1[0-1]', 'P2[1-2]', 'P3[2-4]', 'P4[4-5]', 'P2[5-8]', 'P1[8-15]',
    ]);
    // Completions: P3→4, P4→5, P2→8, P1→15
    const metrics = result.metrics.perProcess;
    expect(metrics.find((m) => m.id === 'P3')?.completion).toBe(4);
    expect(metrics.find((m) => m.id === 'P4')?.completion).toBe(5);
    expect(metrics.find((m) => m.id === 'P2')?.completion).toBe(8);
    expect(metrics.find((m) => m.id === 'P1')?.completion).toBe(15);
  });

  it('P1(0,2),P2(4,3),P3(5,1) → null[2-4],P2[4-5],P3[5-6],P2[6-8]', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 4, burst_time: 3 },
      { id: 'P3', arrival_time: 5, burst_time: 1 },
    ];
    const result = run(processes, { algorithm: srtfAlgo });
    expect(intervalStr(result)).toEqual([
      'P1[0-2]', 'null[2-4]', 'P2[4-5]', 'P3[5-6]', 'P2[6-8]',
    ]);
  });

  it('P1(2,2),P2(6,4),P3(12,2) → múltiples inactividades', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 2, burst_time: 2 },
      { id: 'P2', arrival_time: 6, burst_time: 4 },
      { id: 'P3', arrival_time: 12, burst_time: 2 },
    ];
    const result = run(processes, { algorithm: srtfAlgo });
    expect(intervalStr(result)).toEqual([
      'null[0-2]', 'P1[2-4]', 'null[4-6]', 'P2[6-10]', 'null[10-12]', 'P3[12-14]',
    ]);
  });
});

// ── T-11 · Modo 'on-quantum' (Round Robin) ───────────────────────────────────

describe('T-11 · Round Robin (on-quantum)', () => {
  it('P1(0,5),P2(1,4),P3(2,2),q=2 → diagrama correcto y métricas', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
    ];
    const result = run(processes, { algorithm: rrAlgo, quantum: 2 });
    expect(intervalStr(result)).toEqual([
      'P1[0-2]', 'P2[2-4]', 'P3[4-6]', 'P1[6-8]', 'P2[8-10]', 'P1[10-11]',
    ]);
    expect(r2(result.metrics.aggregate.avgWaiting)).toBe(4.33);
    expect(r2(result.metrics.aggregate.avgTurnaround)).toBe(8);
  });

  it('P1(0,2),P2(5,4),P3(12,3),q=3 → inactividades [2-5] y [9-12]; P2 completa en tick 9', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 5, burst_time: 4 },
      { id: 'P3', arrival_time: 12, burst_time: 3 },
    ];
    const result = run(processes, { algorithm: rrAlgo, quantum: 3 });
    // Criterio explícito de BEHAVIOURS: CPU inactiva en [2-5] y [9-12]
    const idleIntervals = result.intervals.filter((i) => i.pid === null);
    expect(idleIntervals).toEqual([
      { pid: null, start: 2, end: 5 },
      { pid: null, start: 9, end: 12 },
    ]);
    // P2 corre 4 ticks totales (burst=4) entre los ticks 5 y 8
    const p2Metrics = result.metrics.perProcess.find((m) => m.id === 'P2');
    expect(p2Metrics?.completion).toBe(9);
    // P3 corre de tick 12 a 14 (3 ticks), completa en 15
    const p3Metrics = result.metrics.perProcess.find((m) => m.id === 'P3');
    expect(p3Metrics?.completion).toBe(15);
  });

  it('P1(0,3),P2(0,2),P3(0,1),q=1 → completions P3→3, P2→5, P1→6', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 0, burst_time: 2 },
      { id: 'P3', arrival_time: 0, burst_time: 1 },
    ];
    const result = run(processes, { algorithm: rrAlgo, quantum: 1 });
    expect(intervalStr(result)).toEqual([
      'P1[0-1]', 'P2[1-2]', 'P3[2-3]', 'P1[3-4]', 'P2[4-5]', 'P1[5-6]',
    ]);
    const m = result.metrics.perProcess;
    expect(m.find((x) => x.id === 'P3')?.completion).toBe(3);
    expect(m.find((x) => x.id === 'P2')?.completion).toBe(5);
    expect(m.find((x) => x.id === 'P1')?.completion).toBe(6);
  });
});

// ── T-12 · deriveIntervals y deriveMetrics ───────────────────────────────────

describe('T-12 · Derivación de intervals y metrics', () => {
  it('deriveIntervals colapsa tramos consecutivos del mismo pid', () => {
    const processes: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 3 }];
    const result = run(processes, { algorithm: fcfsAlgo });
    // P1 debe ser un único intervalo [0-3], no tres intervalos separados
    expect(result.intervals.length).toBe(1);
    expect(result.intervals[0]).toEqual({ pid: 'P1', start: 0, end: 3 });
  });

  it('métricas FCFS caso 1: completion, turnaround, waiting, response correctos', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
      { id: 'P3', arrival_time: 1, burst_time: 4 },
    ];
    const result = run(processes, { algorithm: fcfsAlgo });
    const m = result.metrics.perProcess;
    const p1 = m.find((x) => x.id === 'P1');
    const p2 = m.find((x) => x.id === 'P2');
    const p3 = m.find((x) => x.id === 'P3');
    // P1: llega 0, burst 3, completa en 3 → turnaround=3, waiting=0, response=0
    expect(p1).toEqual({ id: 'P1', completion: 3, turnaround: 3, waiting: 0, response: 0 });
    // P3: llega 1, burst 4, completa en 7 → turnaround=6, waiting=2, response=2
    expect(p3).toEqual({ id: 'P3', completion: 7, turnaround: 6, waiting: 2, response: 2 });
    // P2: llega 2, burst 2, completa en 9 → turnaround=7, waiting=5, response=5
    expect(p2).toEqual({ id: 'P2', completion: 9, turnaround: 7, waiting: 5, response: 5 });
  });

  it('deriveMetrics con history vacío devuelve ceros', () => {
    const result = deriveMetrics([], []);
    expect(result.aggregate.avgWaiting).toBe(0);
    expect(result.perProcess).toEqual([]);
  });
});

// ── T-13 · Coherencia del history ────────────────────────────────────────────

describe('T-13 · Coherencia del history', () => {
  it('completed crece monotónicamente tick a tick', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 1, burst_time: 2 },
    ];
    const result = run(processes, { algorithm: fcfsAlgo });
    let prev = 0;
    for (const event of result.history) {
      expect(event.completed.length).toBeGreaterThanOrEqual(prev);
      prev = event.completed.length;
    }
  });

  it('en el tick 0 completed está vacío (si ningún proceso completa en tick 0)', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
    ];
    const result = run(processes, { algorithm: fcfsAlgo });
    expect(result.history[0]?.completed).toEqual([]);
  });

  it('en el último tick completed contiene todos los procesos', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 1, burst_time: 2 },
    ];
    const result = run(processes, { algorithm: fcfsAlgo });
    const last = result.history[result.history.length - 1];
    const sortedCompleted = last !== undefined ? [...last.completed].sort() : [];
    expect(sortedCompleted).toEqual(['P1', 'P2']);
  });

  it('onCPU no aparece en ready en el mismo tick', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 1, burst_time: 2 },
    ];
    const result = run(processes, { algorithm: fcfsAlgo });
    for (const event of result.history) {
      if (event.onCPU !== null) {
        expect(event.ready).not.toContain(event.onCPU);
      }
    }
  });
});

// ── T-14 · Casos límite ───────────────────────────────────────────────────────

describe('T-14 · Casos límite', () => {
  it('sin procesos → history vacío, sin error', () => {
    const result = run([], { algorithm: fcfsAlgo });
    expect(result.history).toEqual([]);
    expect(result.intervals).toEqual([]);
    expect(result.metrics.perProcess).toEqual([]);
  });

  it('burst_time = 0 → lanza "La ráfaga debe ser mayor que 0"', () => {
    const processes: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 0 }];
    expect(() => run(processes, { algorithm: fcfsAlgo })).toThrow(
      'La ráfaga debe ser mayor que 0',
    );
  });

  it('algoritmo defectuoso (select devuelve id inexistente) → CPU idle → límite de ticks', () => {
    const badAlgo: IAlgorithm = {
      name: 'bad',
      preemptionMode: 'none',
      requires: {},
      select(): ReadyProcess {
        // Devuelve un proceso ficticio no presente en la cola
        return { id: 'GHOST', arrival_time: 0, burst_time: 1, remaining: 1 };
      },
    };
    const processes: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 1 }];
    expect(() => run(processes, { algorithm: badAlgo })).toThrow(
      'Se excedió el límite de ticks',
    );
  });
});

// ── T-15 · Aislamiento Node ───────────────────────────────────────────────────

describe('T-15 · Simulador independiente de la vista', () => {
  it('run() produce history, intervals y metrics no vacíos sin dependencias de React/DOM', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
    ];
    const result = run(processes, { algorithm: fcfsAlgo });
    expect(result.history.length).toBeGreaterThan(0);
    expect(result.intervals.length).toBeGreaterThan(0);
    expect(result.metrics.perProcess.length).toBeGreaterThan(0);
    expect(result.metrics.aggregate.avgWaiting).toBeGreaterThanOrEqual(0);
  });

  it('SimulationResult tiene la estructura correcta (history, intervals, metrics)', () => {
    const processes: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 2 }];
    const result = run(processes, { algorithm: fcfsAlgo });
    expect(result).toHaveProperty('history');
    expect(result).toHaveProperty('intervals');
    expect(result).toHaveProperty('metrics');
    expect(result.metrics).toHaveProperty('perProcess');
    expect(result.metrics).toHaveProperty('aggregate');
  });
});
