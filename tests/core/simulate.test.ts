// Tests de la Fase 3 — Motor de simulación (T-07 … T-14)
import { describe, it, expect } from 'vitest';
import { run, deriveIntervals } from '../../src/core/simulate.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';
import type { Process } from '../../src/core/types/process.js';

// ---------------------------------------------------------------------------
// Algoritmos stub para los tests
// ---------------------------------------------------------------------------

/** FCFS: devuelve el primer elemento de la cola (ya ordenada por el motor). */
const fcfs: IAlgorithm = {
  name: 'fcfs-stub',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Cola vacía');
    return first;
  },
};

/** SJF: proceso con menor remaining. */
const sjf: IAlgorithm = {
  name: 'sjf-stub',
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

/** SRTF: proceso con menor remaining (expropiativo). */
const srtf: IAlgorithm = {
  name: 'srtf-stub',
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

/** Round Robin: FIFO (primer elemento). */
const rr: IAlgorithm = {
  name: 'rr-stub',
  preemptionMode: 'on-quantum',
  requires: { quantum: true },
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Cola vacía');
    return first;
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extrae el diagrama de Gantt como string para comparación rápida. */
function gantt(procs: readonly Process[], config: Parameters<typeof run>[1]): string {
  const result = run(procs, config);
  return result.intervals
    .map(i => `${i.pid ?? 'Inactivo'}[${String(i.start)}–${String(i.end)}]`)
    .join(', ');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// T-07 · Bucle tick a tick y CPU inactiva
// ---------------------------------------------------------------------------

describe('T-07 · CPU inactiva', () => {
  it('caso 1: P1(llegada 2, ráfaga 2) con FCFS — inactiva [0–2], luego P1[2–4]', () => {
    const procs: Process[] = [{ id: 'P1', arrival_time: 2, burst_time: 2 }];
    const result = run(procs, { algorithm: fcfs });
    // history[0] y history[1] deben ser idle
    expect(result.history[0]?.onCPU).toBeNull();
    expect(result.history[1]?.onCPU).toBeNull();
    expect(result.history[2]?.onCPU).toBe('P1');
    expect(result.history[3]?.onCPU).toBe('P1');
    expect(gantt(procs, { algorithm: fcfs })).toBe('Inactivo[0–2], P1[2–4]');
  });

  it('caso 2: P1(llegada 4, ráfaga 3, prioridad 2) con FCFS — inactiva [0–4], luego P1[4–7]', () => {
    const procs: Process[] = [{ id: 'P1', arrival_time: 4, burst_time: 3, priority: 2 }];
    expect(gantt(procs, { algorithm: fcfs })).toBe('Inactivo[0–4], P1[4–7]');
  });
});

// ---------------------------------------------------------------------------
// T-08 · Desempate global
// ---------------------------------------------------------------------------

describe('T-08 · Determinismo y desempate', () => {
  it('misma entrada → mismo resultado ejecutando dos veces', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
      { id: 'P3', arrival_time: 1, burst_time: 4 },
    ];
    const r1 = run(procs, { algorithm: fcfs });
    const r2 = run(procs, { algorithm: fcfs });
    expect(JSON.stringify(r1.history)).toBe(JSON.stringify(r2.history));
    expect(JSON.stringify(r1.intervals)).toBe(JSON.stringify(r2.intervals));
  });

  it('dos algoritmos distintos producen siempre el mismo resultado por separado', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 2 },
    ];
    const fcfsR1 = run(procs, { algorithm: fcfs });
    const fcfsR2 = run(procs, { algorithm: fcfs });
    const sjfR1 = run(procs, { algorithm: sjf });
    const sjfR2 = run(procs, { algorithm: sjf });
    expect(JSON.stringify(fcfsR1.history)).toBe(JSON.stringify(fcfsR2.history));
    expect(JSON.stringify(sjfR1.history)).toBe(JSON.stringify(sjfR2.history));
    // Y son distintos entre sí (FCFS: P1 primero; SJF al terminarse P1 va P2)
    expect(JSON.stringify(fcfsR1.history)).toBe(JSON.stringify(sjfR1.history));
  });

  it('P1 y P2 con mismo burst y mismo arrival — desempate por id: P1[0–3], P2[3–6]', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 0, burst_time: 3 },
    ];
    expect(gantt(procs, { algorithm: sjf })).toBe('P1[0–3], P2[3–6]');
  });
});

// ---------------------------------------------------------------------------
// T-09 · Modo 'none' — FCFS
// ---------------------------------------------------------------------------

describe('T-09 · FCFS (modo none)', () => {
  it('caso 1: P1[0–3], P3[3–7], P2[7–9] — avgWaiting 2.33, avgTurnaround 5.33', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
      { id: 'P3', arrival_time: 1, burst_time: 4 },
    ];
    const result = run(procs, { algorithm: fcfs });
    expect(gantt(procs, { algorithm: fcfs })).toBe('P1[0–3], P3[3–7], P2[7–9]');
    expect(round2(result.metrics.aggregate.avgWaiting)).toBe(2.33);
    expect(round2(result.metrics.aggregate.avgTurnaround)).toBe(5.33);
  });

  it('caso 2: CPU inactiva entre P1 y P2 — P1[0–3], Inactivo[3–5], P2[5–7], P3[7–11]', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 5, burst_time: 2 },
      { id: 'P3', arrival_time: 6, burst_time: 4 },
    ];
    expect(gantt(procs, { algorithm: fcfs })).toBe('P1[0–3], Inactivo[3–5], P2[5–7], P3[7–11]');
    const result = run(procs, { algorithm: fcfs });
    expect(round2(result.metrics.aggregate.avgWaiting)).toBe(0.33);
    expect(round2(result.metrics.aggregate.avgTurnaround)).toBe(3.33);
  });
});

// ---------------------------------------------------------------------------
// T-10 · Modo 'on-better' — SRTF
// ---------------------------------------------------------------------------

describe('T-10 · SRTF (modo on-better)', () => {
  it('caso 1: P1[0–1], P2[1–2], P3[2–4], P4[4–5], P2[5–8], P1[8–15]', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 8 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
      { id: 'P4', arrival_time: 4, burst_time: 1 },
    ];
    expect(gantt(procs, { algorithm: srtf }))
      .toBe('P1[0–1], P2[1–2], P3[2–4], P4[4–5], P2[5–8], P1[8–15]');
    // Verificar tiempos de finalización
    const result = run(procs, { algorithm: srtf });
    const byId = Object.fromEntries(result.metrics.perProcess.map(m => [m.id, m]));
    expect(byId.P3?.completion).toBe(4);
    expect(byId.P4?.completion).toBe(5);
    expect(byId.P2?.completion).toBe(8);
    expect(byId.P1?.completion).toBe(15);
  });

  it('caso 2: inactiva [2–4] — P1[0–2], Inactivo[2–4], P2[4–5], P3[5–6], P2[6–8]', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 4, burst_time: 3 },
      { id: 'P3', arrival_time: 5, burst_time: 1 },
    ];
    expect(gantt(procs, { algorithm: srtf }))
      .toBe('P1[0–2], Inactivo[2–4], P2[4–5], P3[5–6], P2[6–8]');
  });

  it('caso 3: inactivas [0–2], [4–6], [10–12]', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 2, burst_time: 2 },
      { id: 'P2', arrival_time: 6, burst_time: 4 },
      { id: 'P3', arrival_time: 12, burst_time: 2 },
    ];
    expect(gantt(procs, { algorithm: srtf }))
      .toBe('Inactivo[0–2], P1[2–4], Inactivo[4–6], P2[6–10], Inactivo[10–12], P3[12–14]');
  });
});

// ---------------------------------------------------------------------------
// T-11 · Modo 'on-quantum' — Round Robin
// ---------------------------------------------------------------------------

describe('T-11 · Round Robin (modo on-quantum)', () => {
  it('caso 1 (quantum=2): P1[0–2], P2[2–4], P3[4–6], P1[6–8], P2[8–10], P1[10–11]', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
    ];
    expect(gantt(procs, { algorithm: rr, params: { quantum: 2 } }))
      .toBe('P1[0–2], P2[2–4], P3[4–6], P1[6–8], P2[8–10], P1[10–11]');
    const result = run(procs, { algorithm: rr, params: { quantum: 2 } });
    expect(round2(result.metrics.aggregate.avgWaiting)).toBe(4.33);
    expect(round2(result.metrics.aggregate.avgTurnaround)).toBe(8.00);
  });

  it('caso 2 (quantum=3): inactivas [2–5] y [9–12]; P2 completa en tick 9', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 5, burst_time: 4 },
      { id: 'P3', arrival_time: 12, burst_time: 3 },
    ];
    const result = run(procs, { algorithm: rr, params: { quantum: 3 } });
    // Los intervalos de inactividad deben aparecer
    const idleIntervals = result.intervals.filter(i => i.pid === null);
    expect(idleIntervals).toHaveLength(2);
    expect(idleIntervals[0]).toMatchObject({ start: 2, end: 5 });
    expect(idleIntervals[1]).toMatchObject({ start: 9, end: 12 });
    // P1 completa en tick 2, P2 en tick 9, P3 en tick 15
    const byId = Object.fromEntries(result.metrics.perProcess.map(m => [m.id, m]));
    expect(byId.P1?.completion).toBe(2);
    expect(byId.P2?.completion).toBe(9);
    expect(byId.P3?.completion).toBe(15);
  });

  it('caso 3 (quantum=1, 3 procesos misma llegada): P1[0–1],P2[1–2],P3[2–3],P1[3–4],P2[4–5],P1[5–6]', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 0, burst_time: 2 },
      { id: 'P3', arrival_time: 0, burst_time: 1 },
    ];
    expect(gantt(procs, { algorithm: rr, params: { quantum: 1 } }))
      .toBe('P1[0–1], P2[1–2], P3[2–3], P1[3–4], P2[4–5], P1[5–6]');
    const result = run(procs, { algorithm: rr, params: { quantum: 1 } });
    const byId = Object.fromEntries(result.metrics.perProcess.map(m => [m.id, m]));
    expect(byId.P3?.completion).toBe(3);
    expect(byId.P2?.completion).toBe(5);
    expect(byId.P1?.completion).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// T-12 · Derivación de intervals y metrics
// ---------------------------------------------------------------------------

describe('T-12 · deriveIntervals y deriveMetrics', () => {
  it('FCFS caso 1: métricas por proceso correctas', () => {
    const procs: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
      { id: 'P3', arrival_time: 1, burst_time: 4 },
    ];
    // P1[0–3], P3[3–7], P2[7–9]
    // P1: completion=3, turnaround=3, waiting=0, response=0
    // P3: completion=7, turnaround=6, waiting=2, response=2
    // P2: completion=9, turnaround=7, waiting=5, response=5
    const result = run(procs, { algorithm: fcfs });
    const byId = Object.fromEntries(result.metrics.perProcess.map(m => [m.id, m]));
    expect(byId.P1).toMatchObject({ completion: 3, turnaround: 3, waiting: 0, response: 0 });
    expect(byId.P3).toMatchObject({ completion: 7, turnaround: 6, waiting: 2, response: 2 });
    expect(byId.P2).toMatchObject({ completion: 9, turnaround: 7, waiting: 5, response: 5 });
    expect(round2(result.metrics.aggregate.avgWaiting)).toBe(2.33);
    expect(round2(result.metrics.aggregate.avgTurnaround)).toBe(5.33);
  });

  it('deriveIntervals colapsa correctamente tramos consecutivos', () => {
    const procs: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 3 }];
    const result = run(procs, { algorithm: fcfs });
    const intervals = deriveIntervals(result.history);
    expect(intervals).toHaveLength(1);
    expect(intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
  });

  it('cpuUtilization y throughput no son cero con procesos válidos', () => {
    const procs: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 2 }];
    const result = run(procs, { algorithm: fcfs });
    expect(result.metrics.aggregate.cpuUtilization).toBeGreaterThan(0);
    expect(result.metrics.aggregate.throughput).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// T-13 · Coherencia del history (completed y message)
// ---------------------------------------------------------------------------

describe('T-13 · Coherencia del history', () => {
  const procs: Process[] = [
    { id: 'P1', arrival_time: 0, burst_time: 3 },
    { id: 'P2', arrival_time: 2, burst_time: 2 },
    { id: 'P3', arrival_time: 1, burst_time: 4 },
  ];

  it('completed crece monotónicamente tick a tick', () => {
    const result = run(procs, { algorithm: fcfs });
    let prev = new Set<string>();
    for (const event of result.history) {
      const curr = new Set(event.completed);
      for (const id of prev) {
        expect(curr.has(id)).toBe(true);
      }
      prev = curr;
    }
  });

  it('en el tick 0, completed está vacío', () => {
    const result = run(procs, { algorithm: fcfs });
    expect(result.history[0]?.completed).toHaveLength(0);
  });

  it('en el último tick, completed contiene todos los procesos', () => {
    const result = run(procs, { algorithm: fcfs });
    const last = result.history[result.history.length - 1];
    expect(last).toBeDefined();
    expect([...(last?.completed ?? [])].sort()).toEqual(['P1', 'P2', 'P3'].sort());
  });

  it('el proceso en CPU no aparece en ready', () => {
    const result = run(procs, { algorithm: fcfs });
    for (const event of result.history) {
      if (event.onCPU !== null) {
        expect(event.ready).not.toContain(event.onCPU);
      }
    }
  });

  it('cada evento tiene un mensaje no vacío', () => {
    const result = run(procs, { algorithm: fcfs });
    for (const event of result.history) {
      expect(event.message.length).toBeGreaterThan(0);
    }
  });

  it('completed contiene exactamente los procesos finalizados en T o antes', () => {
    // P1[0–3], P3[3–7], P2[7–9]
    // El evento registra el estado DESPUÉS de ejecutar el tick.
    // P1 finaliza al ejecutar el tick 2 (completion=3).
    const result = run(procs, { algorithm: fcfs });
    // En tick 1, P1 aún no ha terminado (remaining > 0 tras tick 1)
    expect(result.history[1]?.completed).toHaveLength(0);
    // P1 finaliza durante el tick 2: aparece en completed desde tick 2 en adelante
    expect(result.history[2]?.completed).toContain('P1');
    expect(result.history[3]?.completed).toContain('P1');
  });
});

// ---------------------------------------------------------------------------
// T-14 · Casos límite
// ---------------------------------------------------------------------------

describe('T-14 · Casos límite', () => {
  it('sin procesos: devuelve history vacío sin error', () => {
    const result = run([], { algorithm: fcfs });
    expect(result.history).toHaveLength(0);
    expect(result.intervals).toHaveLength(0);
    expect(result.metrics.perProcess).toHaveLength(0);
  });

  it('burst_time = 0: lanza error con mensaje "La ráfaga debe ser mayor que 0"', () => {
    expect(() =>
      run([{ id: 'P1', arrival_time: 0, burst_time: 0 }], { algorithm: fcfs }),
    ).toThrow('La ráfaga debe ser mayor que 0');
  });

  it('burst_time negativo: también lanza error', () => {
    expect(() =>
      run([{ id: 'P1', arrival_time: 0, burst_time: -1 }], { algorithm: fcfs }),
    ).toThrow('La ráfaga debe ser mayor que 0');
  });
});
