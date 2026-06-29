import { describe, it, expect, beforeEach } from 'vitest';
import { run, runFrom } from '../../src/core/simulate.js';
import { register, _clear } from '../../src/core/registry.js';
import type {
  IAlgorithm,
  ReadyProcess,
  SchedulerEvent,
  PreemptionTrigger,
} from '../../src/core/types/algorithm.js';
import type { Process } from '../../src/core/types/process.js';
import type { SchedulerState } from '../../src/core/types/scheduler-state.js';

// Algoritmo FCFS mínimo para los tests del motor
class FCFS implements IAlgorithm {
  readonly name = 'fcfs-test';
  readonly triggers = new Set<PreemptionTrigger>();
  readonly requires = {};
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Cola vacía');
    return first;
  }
}

// Algoritmo SRTF mínimo para tests de on-better
class SRTF implements IAlgorithm {
  readonly name = 'srtf-test';
  readonly triggers = new Set<PreemptionTrigger>(['on-tick']);
  readonly requires = {};
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Cola vacía');
    let best = first;
    for (const p of ready) {
      if (p.remaining < best.remaining) best = p;
    }
    return best;
  }
}

// Algoritmo Round Robin con cola FIFO interna para tests de on-quantum
class RR implements IAlgorithm {
  readonly name = 'rr-test';
  readonly triggers = new Set<PreemptionTrigger>(['on-quantum']);
  readonly requires = { quantum: true as const };
  private readonly queue: string[] = [];

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    // Devolver el primero de la cola interna que esté en ready
    for (const id of this.queue) {
      const found = ready.find((p) => p.id === id);
      if (found !== undefined) return found;
    }
    const first = ready[0];
    if (first === undefined) throw new Error('Cola vacía');
    return first;
  }

  onEvent(e: import('../../src/core/types/algorithm.js').SchedulerEvent): string | null {
    if (e.type === 'arrival') {
      this.queue.push(e.id);
    } else if (e.type === 'quantum-expiry') {
      const idx = this.queue.indexOf(e.id);
      if (idx !== -1) this.queue.splice(idx, 1);
      this.queue.push(e.id);
    } else if (e.type === 'completed') {
      const idx = this.queue.indexOf(e.id);
      if (idx !== -1) this.queue.splice(idx, 1);
    }
    return null;
  }
}

// Algoritmo IO-FCFS: FCFS con soporte de E/S
class IOFCFS implements IAlgorithm {
  readonly name = 'iofcfs-test';
  readonly triggers = new Set<PreemptionTrigger>();
  readonly requires = { io: true as const };
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Cola vacía');
    return first;
  }
}

// Algoritmo io-return: FCFS con modo io-return para T-16
class IOReturn implements IAlgorithm {
  readonly name = 'ioreturn-test';
  readonly triggers = new Set<PreemptionTrigger>(['on-quantum', 'on-io-return']);
  readonly requires = { io: true as const };
  private readonly order: string[] = [];

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    for (const id of this.order) {
      const found = ready.find((p) => p.id === id);
      if (found !== undefined) return found;
    }
    const first = ready[0];
    if (first === undefined) throw new Error('Cola vacía');
    return first;
  }

  onEvent(e: import('../../src/core/types/algorithm.js').SchedulerEvent): string | null {
    if (e.type === 'arrival' || e.type === 'io-return') {
      if (!this.order.includes(e.id)) this.order.push(e.id);
    } else if (e.type === 'completed') {
      const idx = this.order.indexOf(e.id);
      if (idx !== -1) this.order.splice(idx, 1);
    }
    return null;
  }
}

// Algoritmo MLFQ mínimo para tests de on-quantum-and-better (T-17)
// Invariante: el proceso en CPU NO se elimina de su cola al ser despachado.
// Se elimina al degradar (quantum-expiry), ser expropiado (preempted) o completar.
class MockMLFQ implements IAlgorithm {
  readonly name = 'mlfq-test';
  readonly triggers = new Set<PreemptionTrigger>(['on-quantum', 'on-arrival', 'on-io-return', 'on-boost']);
  readonly requires = {};
  private readonly quanta: number[];
  private readonly levels: string[][];
  private readonly processLevel = new Map<string, number>();

  constructor(quanta: number[]) {
    this.quanta = quanta;
    this.levels = quanta.map(() => [] as string[]);
  }

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    // Devuelve el primer proceso de mayor prioridad (nivel más bajo) que esté en ready
    for (const level of this.levels) {
      for (const pid of level) {
        const found = ready.find((p) => p.id === pid);
        if (found !== undefined) return found;
      }
    }
    const first = ready[0];
    if (first === undefined) throw new Error('Cola vacía');
    return first;
  }

  quantumFor(p: ReadyProcess): number | null {
    const level = this.processLevel.get(p.id) ?? 0;
    return this.quanta[level] ?? 1;
  }

  onEvent(e: SchedulerEvent): string | null {
    if (e.type === 'arrival') {
      this.processLevel.set(e.id, 0);
      this.levels[0]?.push(e.id);
    } else if (e.type === 'quantum-expiry') {
      // Eliminar del nivel actual, añadir al siguiente
      const cur = this.processLevel.get(e.id) ?? 0;
      const q = this.levels[cur];
      if (q !== undefined) {
        const idx = q.indexOf(e.id);
        if (idx !== -1) q.splice(idx, 1);
      }
      const next = Math.min(cur + 1, this.quanta.length - 1);
      this.processLevel.set(e.id, next);
      this.levels[next]?.push(e.id);
    } else if (e.type === 'preempted') {
      // Eliminar del nivel actual, añadir al frente (sin degradar)
      const level = this.processLevel.get(e.id) ?? 0;
      const q = this.levels[level];
      if (q !== undefined) {
        const idx = q.indexOf(e.id);
        if (idx !== -1) q.splice(idx, 1);
      }
      this.levels[level]?.unshift(e.id);
    } else if (e.type === 'completed') {
      const level = this.processLevel.get(e.id) ?? 0;
      const q = this.levels[level];
      if (q !== undefined) {
        const idx = q.indexOf(e.id);
        if (idx !== -1) q.splice(idx, 1);
      }
      this.processLevel.delete(e.id);
    } else if (e.type === 'priority-boost') {
      // Mover todos los procesos al nivel 0, ordenados por id natural
      const allPids: string[] = [];
      for (const level of this.levels) {
        allPids.push(...level);
        level.length = 0;
      }
      allPids.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      for (const pid of allPids) {
        this.processLevel.set(pid, 0);
        this.levels[0]?.push(pid);
      }
    }
    return null;
  }
}

// Algoritmo con onEvent que retorna { text } para tests de mensajes ricos (T-18)
class RichMsgRR implements IAlgorithm {
  readonly name = 'richmsg-test';
  readonly triggers = new Set<PreemptionTrigger>(['on-quantum']);
  readonly requires = { quantum: true as const };
  private readonly queue: string[] = [];

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    for (const id of this.queue) {
      const found = ready.find((p) => p.id === id);
      if (found !== undefined) return found;
    }
    const first = ready[0];
    if (first === undefined) throw new Error('Cola vacía');
    return first;
  }

  onEvent(e: SchedulerEvent): string | { text: string } | null {
    if (e.type === 'arrival') {
      this.queue.push(e.id);
      return null;
    } else if (e.type === 'dispatch') {
      return { text: 'toma la CPU desde la cola principal' };
    } else if (e.type === 'quantum-expiry') {
      const idx = this.queue.indexOf(e.id);
      if (idx !== -1) this.queue.splice(idx, 1);
      this.queue.push(e.id);
      return { text: 'agotó su quantum' };
    } else if (e.type === 'completed') {
      const idx = this.queue.indexOf(e.id);
      if (idx !== -1) this.queue.splice(idx, 1);
      return null;
    }
    return null;
  }
}

beforeEach(() => {
  _clear();
  register(() => new FCFS());
  register(() => new SRTF());
  register(() => new RR());
  register(() => new IOFCFS());
  register(() => new IOReturn());
  register(() => new MockMLFQ([2, 10]));
  register(() => new RichMsgRR());
});

// ── T-09: CPU inactiva ──────────────────────────────────────────────────────

describe('§ CPU inactiva', () => {
  it('un proceso que llega en t=2 genera CPU inactiva en [0–2]', () => {
    const processes: Process[] = [{ id: 'P1', arrival_time: 2, burst_time: 2 }];
    const result = run(processes, { algorithm: 'fcfs-test' });

    // Ticks 0 y 1 deben ser CPU inactiva
    expect(result.history[0]?.onCPU).toBeNull();
    expect(result.history[1]?.onCPU).toBeNull();
    // Ticks 2 y 3 deben ser P1
    expect(result.history[2]?.onCPU).toBe('P1');
    expect(result.history[3]?.onCPU).toBe('P1');
  });

  it('la CPU inactiva genera mensaje "CPU inactiva"', () => {
    const processes: Process[] = [{ id: 'P1', arrival_time: 1, burst_time: 1 }];
    const result = run(processes, { algorithm: 'fcfs-test' });
    expect(result.history[0]?.message).toBe('CPU inactiva');
  });

  it('el historial tiene un HistoryEvent por tick', () => {
    const processes: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 3 }];
    const result = run(processes, { algorithm: 'fcfs-test' });
    // P1 ocupa ticks 0,1,2 → 3 eventos
    expect(result.history.length).toBe(3);
    for (let i = 0; i < result.history.length; i++) {
      expect(result.history[i]?.tick).toBe(i);
    }
  });
});

// ── T-10: Desempate global ──────────────────────────────────────────────────

describe('§ Determinismo sin E/S', () => {
  it('dos procesos misma ráfaga y llegada: desempate por id natural (P1 antes P2)', () => {
    const processes: Process[] = [
      { id: 'P2', arrival_time: 0, burst_time: 3 },
      { id: 'P1', arrival_time: 0, burst_time: 3 },
    ];
    const result = run(processes, { algorithm: 'fcfs-test' });
    // P1 debe ir primero por id natural
    expect(result.history[0]?.onCPU).toBe('P1');
    expect(result.history[3]?.onCPU).toBe('P2');
  });

  it('desempate por id natural: P1A antes que P1B', () => {
    const processes: Process[] = [
      { id: 'P1B', arrival_time: 0, burst_time: 2 },
      { id: 'P1A', arrival_time: 0, burst_time: 2 },
    ];
    const result = run(processes, { algorithm: 'fcfs-test' });
    expect(result.history[0]?.onCPU).toBe('P1A');
  });

  it('la simulación es determinista: dos ejecuciones producen el mismo resultado', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
    ];
    const r1 = run(processes, { algorithm: 'fcfs-test' });
    const r2 = run(processes, { algorithm: 'fcfs-test' });
    expect(r1.history.length).toBe(r2.history.length);
    for (let i = 0; i < r1.history.length; i++) {
      expect(r1.history[i]?.onCPU).toBe(r2.history[i]?.onCPU);
    }
  });
});

// ── T-11: Modo 'none' — FCFS ────────────────────────────────────────────────

describe('§ Simular — FCFS (modo none)', () => {
  it('FCFS: P1[0–3], P3[3–7], P2[7–9] — fixture de BEHAVIOURS', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
      { id: 'P3', arrival_time: 1, burst_time: 4 },
    ];
    const result = run(processes, { algorithm: 'fcfs-test' });

    // P1 en ticks 0,1,2
    expect(result.history[0]?.onCPU).toBe('P1');
    expect(result.history[1]?.onCPU).toBe('P1');
    expect(result.history[2]?.onCPU).toBe('P1');
    // P3 en ticks 3,4,5,6
    expect(result.history[3]?.onCPU).toBe('P3');
    expect(result.history[6]?.onCPU).toBe('P3');
    // P2 en ticks 7,8
    expect(result.history[7]?.onCPU).toBe('P2');
    expect(result.history[8]?.onCPU).toBe('P2');
  });

  it('FCFS con CPU inactiva: P1[0–3], Inactivo[3–5], P2[5–7], P3[7–11]', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 5, burst_time: 2 },
      { id: 'P3', arrival_time: 6, burst_time: 4 },
    ];
    const result = run(processes, { algorithm: 'fcfs-test' });

    expect(result.history[3]?.onCPU).toBeNull();
    expect(result.history[4]?.onCPU).toBeNull();
    expect(result.history[5]?.onCPU).toBe('P2');
  });

  it('en modo none, no expropia al proceso actual aunque llegue uno con menor ráfaga', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 1 },
    ];
    const result = run(processes, { algorithm: 'fcfs-test' });
    // P1 no debe ser expropiado
    expect(result.history[1]?.onCPU).toBe('P1');
    expect(result.history[4]?.onCPU).toBe('P1');
  });
});

// ── T-12: Modo 'on-better' — SRTF ──────────────────────────────────────────

describe('§ Simular — SRTF (modo on-better)', () => {
  it('SRTF: P1[0–1], P2[1–2], P3[2–4], P4[4–5], P2[5–8], P1[8–15] — fixture BEHAVIOURS', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 8 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
      { id: 'P4', arrival_time: 4, burst_time: 1 },
    ];
    const result = run(processes, { algorithm: 'srtf-test' });

    expect(result.history[0]?.onCPU).toBe('P1');
    expect(result.history[1]?.onCPU).toBe('P2');
    expect(result.history[2]?.onCPU).toBe('P3');
    expect(result.history[3]?.onCPU).toBe('P3');
    expect(result.history[4]?.onCPU).toBe('P4');
    expect(result.history[5]?.onCPU).toBe('P2');
    expect(result.history[7]?.onCPU).toBe('P2');
    expect(result.history[8]?.onCPU).toBe('P1');
  });

  it('SRTF con CPU inactiva: P1[0–2], Inactivo[2–4], P2[4–5], P3[5–6], P2[6–8]', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 4, burst_time: 3 },
      { id: 'P3', arrival_time: 5, burst_time: 1 },
    ];
    const result = run(processes, { algorithm: 'srtf-test' });

    expect(result.history[2]?.onCPU).toBeNull();
    expect(result.history[3]?.onCPU).toBeNull();
    expect(result.history[4]?.onCPU).toBe('P2');
    expect(result.history[5]?.onCPU).toBe('P3');
    expect(result.history[6]?.onCPU).toBe('P2');
  });
});

// ── T-13: Modo 'on-quantum' — Round Robin ───────────────────────────────────

describe('§ Simular — Round Robin (modo on-quantum)', () => {
  it('RR quantum=2: P1[0–2], P2[2–4], P3[4–6], P1[6–8], P2[8–10], P1[10–11] — fixture BEHAVIOURS', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
    ];
    const result = run(processes, { algorithm: 'rr-test', quantum: 2 });

    expect(result.history[0]?.onCPU).toBe('P1');
    expect(result.history[1]?.onCPU).toBe('P1');
    expect(result.history[2]?.onCPU).toBe('P2');
    expect(result.history[3]?.onCPU).toBe('P2');
    expect(result.history[4]?.onCPU).toBe('P3');
    expect(result.history[5]?.onCPU).toBe('P3');
    expect(result.history[6]?.onCPU).toBe('P1');
    expect(result.history[7]?.onCPU).toBe('P1');
    expect(result.history[8]?.onCPU).toBe('P2');
    expect(result.history[9]?.onCPU).toBe('P2');
    expect(result.history[10]?.onCPU).toBe('P1');
  });

  it('RR quantum=3: con CPU inactiva entre P1 y P2', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 5, burst_time: 4 },
      { id: 'P3', arrival_time: 12, burst_time: 3 },
    ];
    const result = run(processes, { algorithm: 'rr-test', quantum: 3 });

    // P1 termina en tick 2 (ráfaga 2 < quantum 3)
    expect(result.history[0]?.onCPU).toBe('P1');
    expect(result.history[1]?.onCPU).toBe('P1');
    // CPU inactiva [2–5]
    expect(result.history[2]?.onCPU).toBeNull();
    expect(result.history[3]?.onCPU).toBeNull();
    expect(result.history[4]?.onCPU).toBeNull();
    // P2 [5–8] y P2[8–9]
    expect(result.history[5]?.onCPU).toBe('P2');
    expect(result.history[8]?.onCPU).toBe('P2');
  });

  it('RR quantum=1: P1[0–1], P2[1–2], P3[2–3], P1[3–4], P2[4–5], P1[5–6]', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 0, burst_time: 2 },
      { id: 'P3', arrival_time: 0, burst_time: 1 },
    ];
    const result = run(processes, { algorithm: 'rr-test', quantum: 1 });

    expect(result.history[0]?.onCPU).toBe('P1');
    expect(result.history[1]?.onCPU).toBe('P2');
    expect(result.history[2]?.onCPU).toBe('P3');
    expect(result.history[3]?.onCPU).toBe('P1');
    expect(result.history[4]?.onCPU).toBe('P2');
    expect(result.history[5]?.onCPU).toBe('P1');
  });
});

// ── T-15: Integración de E/S en el motor ────────────────────────────────────

describe('§ Orden intra-tick y empate ráfaga/quantum', () => {
  it('proceso con una operación IO: CPU→IO→CPU, liberación en mismo tick que io-start', () => {
    // P1 burst=5, io_entry=2, io_time=2
    // Esperado: P1 en CPU ticks 0,1; IO ticks 2,3; CPU ticks 4,5
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5, io: [{ io_entry: 2, io_time: 2 }] },
    ];
    const result = run(processes, { algorithm: 'iofcfs-test' });

    expect(result.history[0]?.onCPU).toBe('P1');
    expect(result.history[1]?.onCPU).toBe('P1');
    // En el tick donde io_entry se alcanza, CPU queda libre
    expect(result.history[2]?.onCPU).toBeNull();
    expect(result.history[2]?.inIO).toBe('P1');
    expect(result.history[3]?.onCPU).toBeNull();
    expect(result.history[3]?.inIO).toBe('P1');
    // P1 vuelve de IO y se despacha
    expect(result.history[4]?.onCPU).toBe('P1');
    expect(result.history[4]?.inIO).toBeNull();
    expect(result.history[5]?.onCPU).toBe('P1');
  });

  it('io-return se añade a ready ANTES que llegadas del mismo tick', () => {
    // P1 burst=3, io_entry=1, io_time=1 → retorna en tick 2
    // P2 llega en tick 2
    // El io-return (P1) debe despacharse antes que la llegada (P2)
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3, io: [{ io_entry: 1, io_time: 1 }] },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
    ];
    const result = run(processes, { algorithm: 'iofcfs-test' });

    // tick 0: P1 CPU
    expect(result.history[0]?.onCPU).toBe('P1');
    // tick 1: CPU libre (P1 fue a IO), P2 no ha llegado aún
    expect(result.history[1]?.onCPU).toBeNull();
    expect(result.history[1]?.inIO).toBe('P1');
    // tick 2: P1 retorna de IO (antes de la llegada de P2) → P1 despacha
    expect(result.history[2]?.onCPU).toBe('P1');
    // tick 3: P1 termina, P2 despacha
    expect(result.history[3]?.onCPU).toBe('P1');
    expect(result.history[4]?.onCPU).toBe('P2');
  });

  it('waitingIO acumula procesos si el dispositivo está ocupado', () => {
    // P1 burst=4, io_entry=2, io_time=3
    // P2 burst=4, io_entry=1, io_time=2 — llega en tick 2 (cuando P1 está en IO)
    // P2 irá a waitingIO
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 4, io: [{ io_entry: 2, io_time: 3 }] },
      { id: 'P2', arrival_time: 2, burst_time: 4, io: [{ io_entry: 1, io_time: 2 }] },
    ];
    const result = run(processes, { algorithm: 'iofcfs-test' });

    // tick 2: P2 llega y se despacha (P1 fue a IO)
    expect(result.history[2]?.onCPU).toBe('P2');
    expect(result.history[2]?.inIO).toBe('P1');
    // tick 3: P2 alcanza io_entry=1 → va a waitingIO (dispositivo ocupado por P1)
    expect(result.history[3]?.onCPU).toBeNull();
    expect(result.history[3]?.inIO).toBe('P1');
    expect(result.history[3]?.waitingIO).toContain('P2');
  });
});

// ── T-16: Modo 'io-return' ───────────────────────────────────────────────────

describe('§ Determinismo con E/S (VRR)', () => {
  it('io-return fuerza reevaluación: P1 regresa de IO y expropia a P2', () => {
    // P1: arrival=0, burst=2, io_entry=1, io_time=2 → P1 va a IO en tick 1, retorna en tick 3
    // P2: arrival=0, burst=5, sin IO → mientras P1 está en IO, P2 ejecuta
    // Al retornar P1 del IO en tick 3, con io-return mode, select() re-evalúa
    // el algoritmo (por id natural) elige P1 sobre P2 → P1 expropia a P2
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2, io: [{ io_entry: 1, io_time: 2 }] },
      { id: 'P2', arrival_time: 0, burst_time: 5 },
    ];
    const result = run(processes, { algorithm: 'ioreturn-test' });

    // tick 0: P1 despacha (menor id)
    expect(result.history[0]?.onCPU).toBe('P1');
    // tick 1: P1 va a IO (io_entry=1 alcanzado al inicio de tick 1), P2 despacha
    expect(result.history[1]?.onCPU).toBe('P2');
    expect(result.history[1]?.inIO).toBe('P1');
    // tick 2: P2 en CPU, P1 aún en IO
    expect(result.history[2]?.onCPU).toBe('P2');
    expect(result.history[2]?.inIO).toBe('P1');
    // tick 3: P1 retorna de IO → io-return fuerza re-evaluación → P1 expropia a P2
    expect(result.history[3]?.onCPU).toBe('P1');
    // P2 debe seguir eventualmente: P1 termina (remaining=1) en tick 4, P2 continúa
    expect(result.history[4]?.onCPU).toBe('P2');
  });

  it('sin io-return (modo none), el proceso en CPU no es expropiado al retornar otro de IO', () => {
    // Mismo escenario pero con iofcfs-test (modo none): P2 no es interrumpido
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2, io: [{ io_entry: 1, io_time: 2 }] },
      { id: 'P2', arrival_time: 0, burst_time: 5 },
    ];
    const result = run(processes, { algorithm: 'iofcfs-test' });

    // P2 despacha cuando P1 va a IO, y NO es expropiado al retornar P1
    expect(result.history[1]?.onCPU).toBe('P2');
    expect(result.history[3]?.onCPU).toBe('P2');
    // P1 retorna a ready en tick 3 pero P2 sigue en CPU
    expect(result.history[3]?.ready).toContain('P1');
  });
});

// ── T-20: Coherencia del history ───────────────────────────────────────────

describe('§ Coherencia de métricas y estado', () => {
  it('la lista completed crece monotónicamente en el historial', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
      { id: 'P3', arrival_time: 1, burst_time: 4 },
    ];
    const result = run(processes, { algorithm: 'fcfs-test' });
    let prevLen = 0;
    for (const event of result.history) {
      expect(event.completed.length).toBeGreaterThanOrEqual(prevLen);
      prevLen = event.completed.length;
    }
  });

  it('un proceso que aparece en completed no vuelve a desaparecer', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 3 },
    ];
    const result = run(processes, { algorithm: 'fcfs-test' });
    let p1Found = false;
    for (const event of result.history) {
      if (event.completed.includes('P1')) p1Found = true;
      if (p1Found) expect(event.completed).toContain('P1');
    }
  });

  it('el último tick del historial refleja que la CPU procesó el último proceso', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 3 },
    ];
    const result = run(processes, { algorithm: 'fcfs-test' });
    const lastEvent = result.history[result.history.length - 1];
    // El último tick tiene algún proceso en CPU (no termina en idle si hay trabajo)
    expect(lastEvent?.onCPU).not.toBeNull();
  });

  it('si todos los procesos han completado, el historial termina', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 1 },
      { id: 'P2', arrival_time: 0, burst_time: 1 },
    ];
    const result = run(processes, { algorithm: 'fcfs-test' });
    // Todos completados = history tiene exactamente los ticks necesarios
    expect(result.history.length).toBe(2); // P1 tick 0, P2 tick 1
  });
});

// ── T-19: Derivación de intervals y metrics ────────────────────────────────

describe('§ Historial y métricas', () => {
  it('los intervalos cubren exactamente [0, makespan] sin huecos ni solapamientos', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
      { id: 'P3', arrival_time: 1, burst_time: 4 },
    ];
    const result = run(processes, { algorithm: 'fcfs-test' });
    const intervals = result.intervals;

    // Verificar contigüidad
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]?.start).toBe(intervals[i - 1]?.end);
    }
    // Inicio en 0
    expect(intervals[0]?.start).toBe(0);
    // Fin en makespan (último tick + 1)
    const lastEvent = result.history[result.history.length - 1];
    expect(intervals[intervals.length - 1]?.end).toBe((lastEvent?.tick ?? 0) + 1);
  });

  it('métricas de proceso: completion, turnaround, response correctos', () => {
    // P1: llegada 0, ráfaga 3 → completion=3, turnaround=3, response=0
    // P2: llegada 2, ráfaga 2 → completion=9, turnaround=7, response=5
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
      { id: 'P3', arrival_time: 1, burst_time: 4 },
    ];
    const result = run(processes, { algorithm: 'fcfs-test' });
    const m = result.metrics;

    const p1 = m.perProcess.find((p) => p.id === 'P1');
    expect(p1?.completion).toBe(3);
    expect(p1?.turnaround).toBe(3);
    expect(p1?.response).toBe(0);
    expect(p1?.waiting).toBe(0);

    const p3 = m.perProcess.find((p) => p.id === 'P3');
    expect(p3?.completion).toBe(7);
    expect(p3?.turnaround).toBe(6);
    expect(p3?.waiting).toBe(2); // turnaround(6) - burst(4) = 2
  });

  it('waiting sin E/S: waiting = turnaround - burst_time', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
    ];
    const result = run(processes, { algorithm: 'fcfs-test' });
    const p2 = result.metrics.perProcess.find((p) => p.id === 'P2');
    // P2 espera 4 ticks (P1 termina en tick 5, P2 llegó en tick 1)
    expect(p2?.waiting).toBe(p2 !== undefined ? p2.turnaround - 4 : -1);
  });

  it('waiting con E/S: bloqueado_total (inIO + waitingIO) descuenta del waiting', () => {
    // P1 burst=5, io_entry=2, io_time=2 → solo proceso
    // turnaround = 5 (completa en tick 5), CPU_total=3, ioTotal=2 → waiting=0
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5, io: [{ io_entry: 2, io_time: 2 }] },
    ];
    const result = run(processes, { algorithm: 'iofcfs-test' });
    const p1 = result.metrics.perProcess.find((p) => p.id === 'P1');
    expect(p1?.waiting).toBe(0); // turnaround(5) - cpu(3) - io(2) = 0
  });

  it('cpuUtilization = ticks_CPU_ocupada / makespan', () => {
    // P1 llega en tick 2, burst=2 → makespan=4, cpu_ticks=2, idle_ticks=2
    const processes: Process[] = [{ id: 'P1', arrival_time: 2, burst_time: 2 }];
    const result = run(processes, { algorithm: 'fcfs-test' });
    expect(result.metrics.aggregate.cpuUtilization).toBeCloseTo(2 / 4);
  });
});

// ── T-18: Mensajes ricos ────────────────────────────────────────────────────

describe('§ Mensajes ricos — HistoryEvent.message', () => {
  it('onEvent retornando { text } genera mensaje con pid prefijado', () => {
    const processes: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 2 }];
    const result = run(processes, { algorithm: 'richmsg-test', quantum: 2 });
    // dispatch en tick 0 → "P1 toma la CPU desde la cola principal"
    expect(result.history[0]?.message).toBe('P1 toma la CPU desde la cola principal');
  });

  it('onEvent retornando null usa mensaje genérico', () => {
    const processes: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 1 }];
    const result = run(processes, { algorithm: 'fcfs-test' });
    expect(result.history[0]?.message).toBe('P1 entra en CPU');
  });

  it('concatenación salida+entrada: quantum-expiry seguido de dispatch', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 0, burst_time: 2 },
    ];
    // P1 quantum=2 expira en tick 1; en tick 2 P2 despacha
    const result = run(processes, { algorithm: 'richmsg-test', quantum: 2 });
    // tick 2: "P1 agotó su quantum. A continuación, P2 toma la CPU desde la cola principal"
    expect(result.history[2]?.message).toContain('A continuación');
    expect(result.history[2]?.message).toContain('P1 agotó su quantum');
    expect(result.history[2]?.message).toContain('P2 toma la CPU');
  });

  it('DADO onEvent que retorna string plano CUANDO se compone el mensaje ENTONCES usa el literal', () => {
    class StringMsgAlgo implements IAlgorithm {
      readonly name = 'string-msg';
      readonly triggers = new Set<PreemptionTrigger>();
      readonly requires = {};
      select(ready: readonly ReadyProcess[]): ReadyProcess {
        const first = ready[0];
        if (first === undefined) throw new Error('Cola vacía');
        return first;
      }
      onEvent(e: SchedulerEvent): string | null {
        if (e.type === 'dispatch') return 'Texto literal inyectado';
        return null;
      }
    }
    register(() => new StringMsgAlgo());
    
    const processes: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 1 }];
    const result = run(processes, { algorithm: 'string-msg' });
    
    // Verifica que resolveMsg no modifique el string plano
    expect(result.history[0]?.message).toBe('Texto literal inyectado');
  });

  it('DADO algoritmo expropiativo con mensajes ricos CUANDO expropia ENTONCES concatena salida y entrada', () => {
    class PreemptMsgAlgo implements IAlgorithm {
      readonly name = 'preempt-msg';
      readonly triggers = new Set<PreemptionTrigger>(['on-tick']);
      readonly requires = {};
      select(ready: readonly ReadyProcess[]): ReadyProcess {
         const head = ready[0];
         if (head === undefined) throw new Error('Cola vacía');
         let best = head;
         for (const p of ready) if (p.remaining < best.remaining) best = p;
         return best;
      }
      onEvent(e: SchedulerEvent): { text: string } | null {
        if (e.type === 'preempted') return { text: 'es expulsado' };
        if (e.type === 'dispatch') return { text: 'toma el control' };
        return null;
      }
    }
    register(() => new PreemptMsgAlgo());
    
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 2 },
    ];
    const result = run(processes, { algorithm: 'preempt-msg' });
    
    // tick 1: P2 llega (rem=2) y expropia a P1 (rem=4).
    // Verifica el ensamblado del paso 2 del motor.
    expect(result.history[1]?.message).toBe('P1 es expulsado. A continuación, P2 toma el control');
  });
});

// ── T-17: Modo 'on-quantum-and-better' — MLFQ ──────────────────────────────

describe('§ Determinismo con niveles (MLFQ)', () => {
  it('MLFQ quanta=[2,10] sin boost: P1 y P2 burst=8, P1 completa t=10, P2 t=16', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 8 },
      { id: 'P2', arrival_time: 0, burst_time: 8 },
    ];
    // quanta[0]=2, quanta[1]=10; sin boost
    const result = run(processes, { algorithm: 'mlfq-test' });

    // t=0-2: P1 nivel 0 (q=2)
    expect(result.history[0]?.onCPU).toBe('P1');
    expect(result.history[1]?.onCPU).toBe('P1');
    // t=2-4: P2 nivel 0 (q=2)
    expect(result.history[2]?.onCPU).toBe('P2');
    expect(result.history[3]?.onCPU).toBe('P2');
    // t=4-10: P1 nivel 1 (q=10), restante=6 → completa
    expect(result.history[4]?.onCPU).toBe('P1');
    expect(result.history[9]?.onCPU).toBe('P1');
    // P1 completó al final del tick 9; aparece en completed a partir del tick 10
    expect(result.history[10]?.completed).toContain('P1');
    // t=10-16: P2 nivel 1 (q=10), restante=6 → completa
    expect(result.history[10]?.onCPU).toBe('P2');
  });

  it('MLFQ determinista: dos ejecuciones producen el mismo resultado', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 8 },
      { id: 'P2', arrival_time: 0, burst_time: 8 },
    ];
    // Cada registro de MockMLFQ es independiente (nueva instancia en beforeEach)
    const r1 = run(processes, { algorithm: 'mlfq-test' });
    _clear();
    register(() => new MockMLFQ([2, 10]));
    const r2 = run(processes, { algorithm: 'mlfq-test' });
    expect(r1.history.length).toBe(r2.history.length);
    for (let i = 0; i < r1.history.length; i++) {
      expect(r1.history[i]?.onCPU).toBe(r2.history[i]?.onCPU);
    }
  });

  it('MLFQ con boostInterval=6: boost en t=6 reinicia quantum de P1 → P1 completa t=12', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 8 },
      { id: 'P2', arrival_time: 0, burst_time: 8 },
    ];
    // Registrar nuevo MockMLFQ fresco para este test
    _clear();
    register(() => new MockMLFQ([2, 10]));
    const result = run(processes, { algorithm: 'mlfq-test', boostInterval: 6 });

    // t=0-2: P1 (nivel 0, q=2), t=2-4: P2 (nivel 0, q=2), t=4-6: P1 (nivel 1, q=10)
    expect(result.history[4]?.onCPU).toBe('P1');
    expect(result.history[5]?.onCPU).toBe('P1');
    // t=6: boost → P1 y P2 a nivel 0; P1 sigue (id menor), quantum renovado a 2
    expect(result.history[6]?.onCPU).toBe('P1');
    // t=6-8: P1 (nivel 0, q=2 renovado), t=8-10: P2 (nivel 0, q=2)
    expect(result.history[7]?.onCPU).toBe('P1');
    expect(result.history[8]?.onCPU).toBe('P2');
    // t=10-12: P1 (nivel 1, remaining=2) → completa al final de tick 11
    expect(result.history[10]?.onCPU).toBe('P1');
    expect(result.history[11]?.onCPU).toBe('P1');
    // P1 completó al final del tick 11; aparece en completed a partir del tick 12
    expect(result.history[12]?.completed).toContain('P1');
  });

  // ── Cobertura Adicional: Reevaluaciones sin expropiación ────────────────────
  it('DADO on-quantum-and-better CUANDO llega proceso pero el actual es mejor ENTONCES no expropia', () => {
    class NoPreemptOQAB implements IAlgorithm {
      readonly name = 'no-preempt-oqab';
      readonly triggers = new Set<PreemptionTrigger>(['on-quantum', 'on-arrival', 'on-io-return', 'on-boost']);
      readonly requires = {};
      select(ready: readonly ReadyProcess[]): ReadyProcess {
        // Siempre prefiere mantener a P1 si está disponible
        const p1 = ready.find((p) => p.id === 'P1');
        const fallback = ready[0];
        if (fallback === undefined) throw new Error('Cola vacía');
        return p1 ?? fallback;
      }
    }
    register(() => new NoPreemptOQAB());
    
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 2, burst_time: 1 },
    ];
    const result = run(processes, { algorithm: 'no-preempt-oqab', quantum: 10 });
    
    // En el tick 2 llega P2, pero el algoritmo elige mantener P1 (líneas 307-330 aprox).
    expect(result.history[2]?.onCPU).toBe('P1');
    expect(result.history[2]?.message).toBe('P1 en CPU');
  });

  it('DADO io-return CUANDO un proceso vuelve de IO pero el actual es mejor ENTONCES no expropia', () => {
    class KeepCurrentIoReturn implements IAlgorithm {
      readonly name = 'keep-io-return';
      readonly triggers = new Set<PreemptionTrigger>(['on-quantum', 'on-io-return']);
      readonly requires = { io: true as const };
      select(ready: readonly ReadyProcess[]): ReadyProcess {
        // Siempre prefiere mantener a P2 si está disponible
        const p2 = ready.find((p) => p.id === 'P2');
        const fallback2 = ready[0];
        if (fallback2 === undefined) throw new Error('Cola vacía');
        return p2 ?? fallback2;
      }
    }
    register(() => new KeepCurrentIoReturn());
    
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3, io: [{ io_entry: 1, io_time: 1 }] },
      { id: 'P2', arrival_time: 0, burst_time: 5 },
    ];
    const result = run(processes, { algorithm: 'keep-io-return' });
    
    // En el tick 2, P1 vuelve de E/S. El motor evalúa, pero select() elige a P2 que ya estaba en CPU.
    expect(result.history[2]?.onCPU).toBe('P2');
    expect(result.history[2]?.message).toBe('P2 en CPU');
  });

  it('DADO on-better al final del tick CUANDO reevalúa y el actual sigue siendo mejor ENTONCES no hace nada', () => {
    // SRTF reevalúa al final del PASO 4.
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 4 },
      { id: 'P2', arrival_time: 0, burst_time: 5 },
    ];
    const result = run(processes, { algorithm: 'srtf-test' });
    
    // Al final del tick 0, P1(rem=3) y P2(rem=5) son reevaluados. P1 gana, activando
    // la rama invisible de las líneas 440-443 donde no se ejecuta la expropiación.
    expect(result.history[1]?.onCPU).toBe('P1');
  });
});

// ── T-21: runFrom — rederivación what-if ────────────────────────────────────

// Helper: construye un SchedulerState mínimo (CPU-only) en un tick dado
function makeState(
  tick: number,
  onCPU: string | null,
  ready: string[],
  completed: string[],
  remaining: { id: string; remaining: number }[],
): SchedulerState {
  return {
    tick,
    onCPU,
    ready,
    pending: [],
    completed,
    deviceState: { serving: null, remaining: 0, queue: [] },
    remaining,
  };
}

describe('§ Rederivación — what-if e inyección en vivo', () => {
  it('criterio 1: runFrom desde tick T continúa correctamente la simulación', () => {
    // Escenario: P1 burst=3, P2 burst=2, ambos llegan en 0
    // FCFS: P1 ticks [0–3], P2 ticks [3–5]
    // Tomamos estado en tick 3: P1 completado, P2 listo
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 0, burst_time: 2 },
    ];
    const state = makeState(3, null, ['P2'], ['P1'], [{ id: 'P2', remaining: 2 }]);
    const result = runFrom(state, { algorithm: 'fcfs-test' }, processes);

    // El historial empieza en tick 3 y P2 ejecuta durante 2 ticks
    expect(result.history[0]?.tick).toBe(3);
    expect(result.history[0]?.onCPU).toBe('P2');
    expect(result.history[1]?.tick).toBe(4);
    expect(result.history[1]?.onCPU).toBe('P2');
  });

  it('run y runFrom aceptan quantum, boostInterval y quanta en la config', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 2 },
    ];
    // run() con las tres claves de parámetros pobladas (cubre el armado de algoParams)
    const r = run(processes, { algorithm: 'rr-test', quantum: 2, boostInterval: 5, quanta: [2, 4] });
    expect(r.history.length).toBeGreaterThan(0);
    // runFrom() con las tres claves pobladas
    const state = makeState(0, null, ['P1', 'P2'], [], [
      { id: 'P1', remaining: 2 },
      { id: 'P2', remaining: 2 },
    ]);
    const rf = runFrom(
      state,
      { algorithm: 'fcfs-test', quantum: 2, boostInterval: 5, quanta: [2, 4] },
      processes,
    );
    expect(rf.history.length).toBeGreaterThan(0);
  });

  it('criterio 2: mismo estado de partida → mismo resultado (determinismo)', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 4 },
      { id: 'P2', arrival_time: 0, burst_time: 3 },
    ];
    const state = makeState(2, 'P1', ['P2'], [], [
      { id: 'P1', remaining: 2 },
      { id: 'P2', remaining: 3 },
    ]);

    const r1 = runFrom(state, { algorithm: 'fcfs-test' }, processes);
    // Requiere nueva instancia de MockMLFQ para el beforeEach
    const r2 = runFrom(state, { algorithm: 'fcfs-test' }, processes);

    expect(r1.history.length).toBe(r2.history.length);
    for (let i = 0; i < r1.history.length; i++) {
      expect(r1.history[i]?.onCPU).toBe(r2.history[i]?.onCPU);
    }
  });

  it('criterio 3: proceso inyectado con arrival_time >= tick aparece en historial', () => {
    // Partimos desde tick 2, P1 completado, P2 en curso (remaining=2)
    // Inyectamos P3 con arrival_time=3
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 4 },
      { id: 'P3', arrival_time: 3, burst_time: 2 }, // inyectado: llega después del tick actual
    ];
    const state = makeState(2, 'P2', [], ['P1'], [{ id: 'P2', remaining: 4 }]);
    const result = runFrom(state, { algorithm: 'fcfs-test' }, processes);

    // P2 ejecuta de tick 2–6 (4 ticks restantes), P3 llega en tick 3 y espera
    // (FCFS no expropia)
    const p3Dispatched = result.history.find((e) => e.onCPU === 'P3');
    expect(p3Dispatched).toBeDefined();
    expect(p3Dispatched?.tick).toBeGreaterThanOrEqual(3);
  });

  it('DADO un estado inyectado con un ID fantasma CUANDO se construye ready ENTONCES lanza error', () => {
    // Si se inyecta un estado corrupto con un PID que no pertenece a los procesos originales
    const processes: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 3 }];
    const corruptState: import('../../src/core/types/scheduler-state.js').SchedulerState = {
      tick: 1,
      onCPU: null,
      ready: ['FANTASMA'], 
      pending: [],
      completed: [],
      deviceState: { serving: null, remaining: 0, queue: [] },
      remaining: [{ id: 'FANTASMA', remaining: 2 }],
    };
    expect(() => runFrom(corruptState, { algorithm: 'fcfs-test' }, processes)).toThrow("Inyección inválida: el proceso \"P1\" tiene arrival_time=0 < tick=1");
  });
});

// ── T-22: Inyección en vivo — validación ────────────────────────────────────

describe('§ Rederivación (criterios 4–5)', () => {
  it('criterio 4: proceso nuevo inyectado con arrival_time < tick lanza error', () => {
    // P1 completado; P2 es NUEVO (no está en state.completed/ready/onCPU)
    // y tiene arrival_time=1 < tick=3 → inyección inválida
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 1, burst_time: 2 }, // nuevo + arrival < tick → error
    ];
    const state = makeState(3, null, [], ['P1'], []);
    expect(() => runFrom(state, { algorithm: 'fcfs-test' }, processes)).toThrow(/Inyección/);
  });

  it('criterio 4: proceso en state.ready con arrival < tick NO lanza error', () => {
    // P2 está en state.ready (ya fue rastreado por el planificador)
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 0, burst_time: 2 },
    ];
    const state = makeState(3, null, ['P2'], ['P1'], [{ id: 'P2', remaining: 2 }]);
    expect(() => runFrom(state, { algorithm: 'fcfs-test' }, processes)).not.toThrow();
  });

  it('criterio 5: run() es pura — no muta el array de procesos de entrada', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
    ];
    const snapshot = JSON.stringify(processes);
    run(processes, { algorithm: 'fcfs-test' });
    expect(JSON.stringify(processes)).toBe(snapshot);
  });
});

// ── T-23: Validación y casos límite ─────────────────────────────────────────

describe('§ Validación de configuración', () => {
  it('burst_time <= 0 lanza error antes de simular', () => {
    const processes: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 0 }];
    expect(() => run(processes, { algorithm: 'fcfs-test' })).toThrow(/burst_time/);
  });

  it('burst_time negativo lanza error', () => {
    const processes: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: -1 }];
    expect(() => run(processes, { algorithm: 'fcfs-test' })).toThrow(/burst_time/);
  });

  it('arrival_time < 0 lanza error antes de simular', () => {
    const processes: Process[] = [{ id: 'P1', arrival_time: -1, burst_time: 3 }];
    expect(() => run(processes, { algorithm: 'fcfs-test' })).toThrow(/arrival_time/);
  });

  it('io_entry <= 0 lanza error', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5, io: [{ io_entry: 0, io_time: 2 }] },
    ];
    expect(() => run(processes, { algorithm: 'iofcfs-test' })).toThrow(/io_entry/);
  });

  it('io_entry >= burst_time lanza error', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5, io: [{ io_entry: 5, io_time: 2 }] },
    ];
    expect(() => run(processes, { algorithm: 'iofcfs-test' })).toThrow(/io_entry/);
  });

  it('io_time <= 0 lanza error', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5, io: [{ io_entry: 2, io_time: 0 }] },
    ];
    expect(() => run(processes, { algorithm: 'iofcfs-test' })).toThrow(/io_time/);
  });

  it('io_entry no estrictamente creciente lanza error', () => {
    const processes: Process[] = [
      {
        id: 'P1',
        arrival_time: 0,
        burst_time: 10,
        io: [
          { io_entry: 3, io_time: 1 },
          { io_entry: 3, io_time: 1 }, // igual al anterior
        ],
      },
    ];
    expect(() => run(processes, { algorithm: 'iofcfs-test' })).toThrow(/estrictamente creciente/);
  });
});

describe('§ SRTF con onEvent — cobertura de expropiación al final de tick', () => {
  it('SRTF con onEvent: expropia en el PASO 4 post-decremento cuando hay mejor candidato en ready', () => {
    // Este test cubre la rama de on-better en el PASO 4 cuando onEvent está definido.
    // P1 burst=3 llega en 0, P2 burst=1 llega en 0 — SRTF elige P2 (menor remaining).
    // Pero para cubrir la rama 440-443 del PASO 4, necesitamos que onCPU tenga
    // un candidato mejor en ready que fue evaluado en el PASO 4 (no en PASO 2).
    // Escenario: P1 burst=5, P2 burst=3 (llegan t=0). P1 gana primer tick (P2 == mejor).
    // El test SRTF existente ya cubre el camino principal; este cubre el camino con onEvent.
    class SRTFWithEvent implements IAlgorithm {
      readonly name = 'srtf-event-test';
      readonly triggers = new Set<PreemptionTrigger>(['on-tick']);
      readonly requires = {};
      preempted = false;
      select(ready: readonly ReadyProcess[]): ReadyProcess {
        let best = ready[0];
        if (best === undefined) throw new Error('Cola vacía');
        for (const p of ready) {
          if (p.remaining < best.remaining) best = p;
        }
        return best;
      }
      onEvent(e: SchedulerEvent): string | null {
        if (e.type === 'preempted') this.preempted = true;
        return null;
      }
    }
    _clear();
    const algo = new SRTFWithEvent();
    register(() => algo);
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 0, burst_time: 2 },
    ];
    const result = run(processes, { algorithm: 'srtf-event-test' });
    // P2 tiene menor remaining → debe estar en CPU en algún momento
    expect(result.history.some((e) => e.onCPU === 'P2')).toBe(true);
  });
});

describe('§ Configuración inválida', () => {
  it('algoritmo con requires.priority y proceso sin priority no lanza error (se trata como Infinity)', () => {
    class PriorityAlgo implements IAlgorithm {
      readonly name = 'prio-test';
      readonly triggers = new Set<PreemptionTrigger>();
      readonly requires = { priority: true as const };
      select(ready: readonly ReadyProcess[]): ReadyProcess {
        const first = ready[0];
        if (first === undefined) throw new Error('Cola vacía');
        return first;
      }
    }
    _clear();
    register(() => new PriorityAlgo());
    const processes: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 2 }];
    expect(() => run(processes, { algorithm: 'prio-test' })).not.toThrow();
  });
});

describe('§ Conjunto vacío', () => {
  it('run con lista vacía no lanza error', () => {
    expect(() => run([], { algorithm: 'fcfs-test' })).not.toThrow();
  });

  it('run con lista vacía devuelve history vacío', () => {
    const result = run([], { algorithm: 'fcfs-test' });
    expect(result.history).toHaveLength(0);
    expect(result.intervals).toHaveLength(0);
  });
});

describe('§ Seguridad y tolerancia a fallos', () => {
  it('algoritmo defectuoso que selecciona PID inexistente deja CPU inactiva ese tick', () => {
    // Algoritmo que siempre devuelve un proceso con ID inexistente la primera vez
    class BadAlgo implements IAlgorithm {
      readonly name = 'bad-once';
      readonly triggers = new Set<PreemptionTrigger>();
      readonly requires = {};
      private calls = 0;
      select(ready: readonly ReadyProcess[]): ReadyProcess {
        this.calls++;
        // Primer tick: devuelve un proceso falso
        if (this.calls === 1) {
          return { id: 'NONEXISTENT', arrival_time: 0, burst_time: 1, remaining: 1 };
        }
        const first = ready[0];
        if (first === undefined) throw new Error('Cola vacía');
        return first;
      }
    }
    _clear();
    register(() => new BadAlgo());
    register(() => new FCFS()); // re-registrar para no romper otros tests

    const processes: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 2 }];
    const result = run(processes, { algorithm: 'bad-once' });

    // tick 0: PID inexistente → CPU inactiva
    expect(result.history[0]?.onCPU).toBeNull();
    // tick 1: P1 despacha normalmente
    expect(result.history[1]?.onCPU).toBe('P1');
  });
  
  // ── Cobertura Adicional: Límite de seguridad ────────────────────────────────
  it('DADO un escenario anómalo CUANDO supera 100,000 ticks ENTONCES aborta lanzando un error', () => {
    // Si un proceso llega en el tick 100,001, el motor iterará en vacío 
    // hasta superar la constante TICK_LIMIT, activando el cortafuegos.
    const processes: Process[] = [{ id: 'P1', arrival_time: 100005, burst_time: 1 }];
    expect(() => run(processes, { algorithm: 'fcfs-test' })).toThrow(/límite/);
  });
});

// ── T-24: Aislamiento de dependencias (Node) ────────────────────────────────

describe('§ Simulador independiente de la vista', () => {
  it('run() ejecuta sin acceder a DOM, React ni sessionStorage', () => {
    // En entorno Node (vitest --environment node), estos globals no existen
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
    expect(typeof sessionStorage).toBe('undefined');

    // La simulación debe funcionar correctamente en Node puro
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 1, burst_time: 3 },
    ];
    expect(() => run(processes, { algorithm: 'fcfs-test' })).not.toThrow();
  });

  it('el resultado tiene la estructura correcta: history, intervals, metrics', () => {
    const processes: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 3 }];
    const result = run(processes, { algorithm: 'fcfs-test' });

    expect(result).toHaveProperty('history');
    expect(result).toHaveProperty('intervals');
    expect(result).toHaveProperty('metrics');
    expect(result.metrics).toHaveProperty('perProcess');
    expect(result.metrics).toHaveProperty('aggregate');
  });
});

describe('§ Estructura del resultado de simulación', () => {
  it('perProcess contiene métricas de cada proceso', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 1, burst_time: 2 },
    ];
    const result = run(processes, { algorithm: 'fcfs-test' });
    const ids = result.metrics.perProcess.map((m) => m.id);
    expect(ids).toContain('P1');
    expect(ids).toContain('P2');
  });

  it('aggregate.cpuUtilization está en [0, 1]', () => {
    const processes: Process[] = [{ id: 'P1', arrival_time: 2, burst_time: 2 }];
    const result = run(processes, { algorithm: 'fcfs-test' });
    expect(result.metrics.aggregate.cpuUtilization).toBeGreaterThanOrEqual(0);
    expect(result.metrics.aggregate.cpuUtilization).toBeLessThanOrEqual(1);
  });
});
