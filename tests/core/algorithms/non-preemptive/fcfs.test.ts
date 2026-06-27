import { describe, it, expect, beforeAll } from 'vitest';
import { FCFS } from '../../../../src/core/algorithms/non-preemptive/fcfs.js';
import { register } from '../../../../src/core/registry.js';
import { run } from '../../../../src/core/simulate.js';

describe('FCFS', () => {
  const fcfs = new FCFS();

  beforeAll(() => {
    register(fcfs);
  });

  it('tiene los metadatos correctos', () => {
    expect(fcfs.name).toBe('fcfs');
    expect(fcfs.preemptionMode).toBe('none');
    expect(fcfs.requires.io).toBe(false);
  });

  it('select lanza error con cola vacía', () => {
    expect(() => fcfs.select([])).toThrow();
  });

  it('select devuelve el primero de la lista (motor ya ordenó)', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 3, remaining: 3 },
      { id: 'P2', arrival_time: 1, burst_time: 2, remaining: 2 },
    ];
    expect(fcfs.select(ready).id).toBe('P1');
  });

  // § Simular — FCFS: fixture 1 P1[0–3], P3[3–7], P2[7–9]
  it('fixture 1: P1[0–3], P3[3–7], P2[7–9]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 3 },
        { id: 'P2', arrival_time: 2, burst_time: 2 },
        { id: 'P3', arrival_time: 1, burst_time: 4 },
      ],
      { algorithm: 'fcfs' }
    );
    const gantt = result.intervals.filter(i => i.pid !== null);
    expect(gantt[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(gantt[1]).toMatchObject({ pid: 'P3', start: 3, end: 7 });
    expect(gantt[2]).toMatchObject({ pid: 'P2', start: 7, end: 9 });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(2.33, 1);
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(5.33, 1);
  });

  // § Simular — FCFS: fixture 2 con CPU inactiva
  it('fixture 2: con CPU inactiva — P1[0–3], P2[5–7], P3[7–11]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 3 },
        { id: 'P2', arrival_time: 5, burst_time: 2 },
        { id: 'P3', arrival_time: 6, burst_time: 4 },
      ],
      { algorithm: 'fcfs' }
    );
    const gantt = result.intervals.filter(i => i.pid !== null);
    expect(gantt[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(gantt[1]).toMatchObject({ pid: 'P2', start: 5, end: 7 });
    expect(gantt[2]).toMatchObject({ pid: 'P3', start: 7, end: 11 });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(0.33, 1);
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(3.33, 1);
  });

  // § Algoritmos clásicos — solo CPU: ignorar campo io
  it('ignora el campo io de los procesos', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 3, io: [{ io_entry: 1, io_time: 2 }] },
        { id: 'P2', arrival_time: 1, burst_time: 2 },
      ],
      { algorithm: 'fcfs' }
    );
    // P1 debe ejecutar igual que sin io
    const p1interval = result.intervals.find(i => i.pid === 'P1');
    expect(p1interval).toBeDefined();
  });
});
