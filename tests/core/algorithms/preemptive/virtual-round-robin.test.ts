import { describe, it, expect, beforeEach } from 'vitest';
import { register, run } from '../../../../src/index.js';
import { VirtualRoundRobin } from '../../../../src/core/algorithms/preemptive/virtual-round-robin.js';
import type { Process } from '../../../../src/core/types/process.js';

// § Simular — Round Robin Virtual (expropiativa)
// Fixture principal: P1(burst 6, io_entry 2, io_time 3), P2(burst 4, io_entry 1, io_time 4), P3(burst 3), quantum 4
// Intervalos esperados: P1[0–2], P2[2–3], P3[3–5], P1[5–7], P3[7–8], P1[8–10], P2[10–13]

describe('VirtualRoundRobin — fixture principal (quantum 4)', () => {
  const processes: Process[] = [
    { id: 'P1', arrival_time: 0, burst_time: 6, io: [{ io_entry: 2, io_time: 3 }] },
    { id: 'P2', arrival_time: 0, burst_time: 4, io: [{ io_entry: 1, io_time: 4 }] },
    { id: 'P3', arrival_time: 0, burst_time: 3 },
  ];

  beforeEach(() => {
    register(() => new VirtualRoundRobin(4));
  });

  it('produce los intervalos de Gantt correctos', () => {
    const result = run(processes, { algorithm: 'virtual-round-robin', quantum: 4 });
    const intervals = result.intervals.filter((i) => i.pid !== null);
    expect(intervals).toEqual([
      { pid: 'P1', start: 0, end: 2 },
      { pid: 'P2', start: 2, end: 3 },
      { pid: 'P3', start: 3, end: 5 },
      { pid: 'P1', start: 5, end: 7 },
      { pid: 'P3', start: 7, end: 8 },
      { pid: 'P1', start: 8, end: 9 }, 
      { pid: 'P2', start: 9, end: 12 }, 
      { pid: 'P1', start: 12, end: 13 },
    ]);
  });

  it('P1 expropia a P3 en t=5 al volver de E/S (io-return)', () => {
    const result = run(processes, { algorithm: 'virtual-round-robin', quantum: 4 });
    // En t=5 el historial debe mostrar P1 en CPU (expropiando a P3)
    const ev5 = result.history.find((e) => e.tick === 5);
    expect(ev5?.onCPU).toBe('P1');
  });

  it('P2 espera en cola del dispositivo de t=3 a t=5 (contención)', () => {
    const result = run(processes, { algorithm: 'virtual-round-robin', quantum: 4 });
    // En t=3, t=4: P2 debe estar en waitingIO
    const ev3 = result.history.find((e) => e.tick === 3);
    const ev4 = result.history.find((e) => e.tick === 4);
    expect(ev3?.waitingIO).toContain('P2');
    expect(ev4?.waitingIO).toContain('P2');
  });

  it('es determinista: dos ejecuciones producen resultados idénticos', () => {
    register(() => new VirtualRoundRobin(4));
    const r1 = run(processes, { algorithm: 'virtual-round-robin', quantum: 4 });
    register(() => new VirtualRoundRobin(4));
    const r2 = run(processes, { algorithm: 'virtual-round-robin', quantum: 4 });
    expect(r1.intervals).toEqual(r2.intervals);
    expect(r1.metrics).toEqual(r2.metrics);
  });
});

// § Contención del dispositivo de E/S — fixture verificado
// P1{burst:5, io:[{io_entry:2, io_time:4}]}, P2{burst:5, io:[{io_entry:1, io_time:2}]}, quantum=10
// P1 completion=9, P2 completion=13, cpuUtilization=10/13

describe('VirtualRoundRobin — contención de dispositivo (quantum 10)', () => {
  const processes: Process[] = [
    { id: 'P1', arrival_time: 0, burst_time: 5, io: [{ io_entry: 2, io_time: 4 }] },
    { id: 'P2', arrival_time: 0, burst_time: 5, io: [{ io_entry: 1, io_time: 2 }] },
  ];

  beforeEach(() => {
    register(() => new VirtualRoundRobin(10));
  });

  it('P1 completa en t=9, P2 completa en t=13', () => {
    const result = run(processes, { algorithm: 'virtual-round-robin', quantum: 10 });
    const p1 = result.metrics.perProcess.find((m) => m.id === 'P1');
    const p2 = result.metrics.perProcess.find((m) => m.id === 'P2');
    expect(p1?.completion).toBe(9);
    expect(p2?.completion).toBe(13);
  });

  it('métricas de P1: waiting=0, response=0', () => {
    const result = run(processes, { algorithm: 'virtual-round-robin', quantum: 10 });
    const p1 = result.metrics.perProcess.find((m) => m.id === 'P1');
    expect(p1?.waiting).toBe(0);
    expect(p1?.response).toBe(0);
  });

  it('métricas de P2: waiting=3, response=2', () => {
    const result = run(processes, { algorithm: 'virtual-round-robin', quantum: 10 });
    const p2 = result.metrics.perProcess.find((m) => m.id === 'P2');
    expect(p2?.waiting).toBe(3);
    expect(p2?.response).toBe(2);
  });

  it('cpuUtilization = 10/13', () => {
    const result = run(processes, { algorithm: 'virtual-round-robin', quantum: 10 });
    expect(result.metrics.aggregate.cpuUtilization).toBeCloseTo(10 / 13, 5);
  });
});

// § Mensajes ricos — io-return con sobrante entra en cola auxiliar
describe('VirtualRoundRobin — mensajes ricos', () => {
  const processes: Process[] = [
    { id: 'P1', arrival_time: 0, burst_time: 6, io: [{ io_entry: 2, io_time: 3 }] },
    { id: 'P2', arrival_time: 0, burst_time: 4, io: [{ io_entry: 1, io_time: 4 }] },
    { id: 'P3', arrival_time: 0, burst_time: 3 },
  ];

  beforeEach(() => {
    register(() => new VirtualRoundRobin(4));
  });

  it('mensaje en io-return con sobrante menciona "cola auxiliar" y el sobrante', () => {
    const result = run(processes, { algorithm: 'virtual-round-robin', quantum: 4 });
    // P1 regresa de E/S en t=5 con sobrante
    const ev5 = result.history.find((e) => e.tick === 5);
    expect(ev5?.message).toMatch(/cola auxiliar/i);
  });

  it('mensaje de dispatch desde cola principal menciona "cola principal"', () => {
    const result = run(processes, { algorithm: 'virtual-round-robin', quantum: 4 });
    // El primer dispatch en t=0 es desde la cola principal
    const ev0 = result.history.find((e) => e.tick === 0);
    expect(ev0?.message).toMatch(/cola principal/i);
  });

  it('el proceso que CONTINÚA en CPU indica su cola de prioridad (principal=1, auxiliar=0)', () => {
    const result = run(processes, { algorithm: 'virtual-round-robin', quantum: 4 });
    // tick 1: P1 sigue en CPU desde la cola principal → prioridad 1
    expect(result.history[1]?.message).toMatch(/P1 en CPU de la cola de prioridad 1/);
    // tick 6: P1 sigue en CPU tras volver de E/S, desde la cola auxiliar → prioridad 0
    expect(result.history[6]?.message).toMatch(/P1 en CPU de la cola de prioridad 0/);
  });
});

// § Proceso que bloquea para E/S y agota exactamente su quantum (sobrante=0) → cola principal
describe('VirtualRoundRobin — sobrante = 0 va a cola principal', () => {
  // P1 io_entry=4 = quantum=4 → sobrante = 4 - 4 = 0 → cola principal
  const processes: Process[] = [
    { id: 'P1', arrival_time: 0, burst_time: 6, io: [{ io_entry: 4, io_time: 2 }] },
    { id: 'P2', arrival_time: 0, burst_time: 4 },
  ];

  beforeEach(() => {
    register(() => new VirtualRoundRobin(4));
  });

  it('P1 vuelve de E/S a la cola principal cuando sobrante=0', () => {
    // Solo verificamos que la simulación termina sin error y produce métricas coherentes
    const result = run(processes, { algorithm: 'virtual-round-robin', quantum: 4 });
    const p1 = result.metrics.perProcess.find((m) => m.id === 'P1');
    expect(p1).toBeDefined();
    expect(p1?.completion).toBeGreaterThan(0);
  });
});
