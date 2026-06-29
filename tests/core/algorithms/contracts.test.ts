/**
 * T-36 — Contrato de extensibilidad
 *
 * Verifica que el motor puede ser extendido con nuevos algoritmos sin modificarlo.
 * Cierra: § Contrato de algoritmo (extensibilidad), § Verificación de contrato de algoritmo (Extensibilidad)
 */
import { describe, it, expect } from 'vitest';
import type {
  IAlgorithm,
  ReadyProcess,
  SchedulerEvent,
  PreemptionTrigger,
} from '../../../src/core/types/algorithm.js';
import { run } from '../../../src/core/simulate.js';
import { register, get } from '../../../src/core/registry.js';
import type { Process } from '../../../src/core/types/process.js';
// Asegurar que los 9 algoritmos oficiales están registrados
import '../../../src/index.js';

// ── Algoritmo minimal: solo select + triggers (patrón sin estado) ─────

class MinimalFCFS implements IAlgorithm {
  readonly name = 'contract-minimal-fcfs';
  readonly triggers = new Set<PreemptionTrigger>();
  readonly requires = {};
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('Cola de listos vacía');
    const first = ready[0];
    if (first === undefined) throw new Error('Cola de listos vacía');
    return first;
  }
}

// ── Algoritmo con onEvent y quantumFor (patrón con estado interno) ────────────

class StatefulRR implements IAlgorithm {
  readonly name: string;
  readonly triggers = new Set<PreemptionTrigger>(['on-quantum']);
  readonly requires = { quantum: true };

  private readonly quantum: number;
  private queue: string[] = [];

  constructor(name: string, quantum = 2) {
    this.name = name;
    this.quantum = quantum;
  }

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('Cola de listos vacía');
    for (const id of this.queue) {
      const found = ready.find((p) => p.id === id);
      if (found !== undefined) return found;
    }
    const first = ready[0];
    if (first === undefined) throw new Error('Cola de listos vacía');
    return first;
  }

  quantumFor(): number | null {
    return this.quantum;
  }

  onEvent(e: SchedulerEvent): string | null {
    switch (e.type) {
      case 'arrival':
        this.queue.push(e.id);
        return null;
      case 'dispatch':
        this.queue = this.queue.filter((x) => x !== e.id);
        return null;
      case 'quantum-expiry':
        this.queue.push(e.id);
        return `${e.id} agotó quantum`;
      case 'completed':
        this.queue = this.queue.filter((x) => x !== e.id);
        return null;
      default:
        return null;
    }
  }
}

// ── Algoritmo con onEvent que retorna string plano ────────────────────────────

class RichMessageAlgo implements IAlgorithm {
  readonly name = 'contract-rich-message';
  readonly triggers = new Set<PreemptionTrigger>();
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('Cola de listos vacía');
    const first = ready[0];
    if (first === undefined) throw new Error('Cola de listos vacía');
    return first;
  }

  onEvent(e: SchedulerEvent): string | null {
    if (e.type === 'dispatch') return 'mensaje plano personalizado';
    return null;
  }
}

// ── Algoritmo con onEvent que retorna null ────────────────────────────────────

class NullMessageAlgo implements IAlgorithm {
  readonly name = 'contract-null-message';
  readonly triggers = new Set<PreemptionTrigger>();
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('Cola de listos vacía');
    const first = ready[0];
    if (first === undefined) throw new Error('Cola de listos vacía');
    return first;
  }

  onEvent(): null {
    return null;
  }
}

// Registrar todos
register(() => new MinimalFCFS());
register(() => new StatefulRR('contract-stateful-rr'));
register(() => new RichMessageAlgo());
register(() => new NullMessageAlgo());

const PROCESSES: Process[] = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 1, burst_time: 2 },
];

describe('§ Contrato de algoritmo (extensibilidad)', () => {
  it('algoritmo minimal produce resultado completo sin modificar el motor', () => {
    const result = run(PROCESSES, { algorithm: 'contract-minimal-fcfs' });
    expect(result.history.length).toBeGreaterThan(0);
    expect(result.intervals.length).toBeGreaterThan(0);
    expect(result.metrics.perProcess.length).toBe(2);
    expect(result.metrics.aggregate).toBeDefined();
  });

  it('algoritmo sin priority: el campo requires no incluye priority', () => {
    const algo = get('contract-minimal-fcfs');
    expect(algo.requires.priority).toBeUndefined();
  });

  it('select con cola vacía lanza error de seguridad', () => {
    const algo = get('contract-minimal-fcfs');
    expect(() => algo.select([])).toThrow();
  });

  it('algoritmo con onEvent + quantumFor: motor invoca onEvent en cada transición', () => {
    const calledTypes: string[] = [];

    class SpiedRR implements IAlgorithm {
      readonly name = 'contract-spied-rr';
      readonly triggers = new Set<PreemptionTrigger>(['on-quantum']);
      readonly requires = { quantum: true };
      private readonly inner = new StatefulRR('inner-rr', 2);
      select(ready: readonly ReadyProcess[]): ReadyProcess { return this.inner.select(ready); }
      quantumFor(): number | null { return this.inner.quantumFor(); }
      onEvent(e: SchedulerEvent): string | null {
        calledTypes.push(e.type);
        return this.inner.onEvent(e);
      }
    }
    register(() => new SpiedRR());

    run(PROCESSES, { algorithm: 'contract-spied-rr' });
    expect(calledTypes).toContain('arrival');
    expect(calledTypes).toContain('dispatch');
    expect(calledTypes).toContain('completed');
  });

  it('motor respeta el slice devuelto por quantumFor', () => {
    // Con quantum=1 y dos procesos llegan en t=0 con burst=2 → Round Robin estricto tick a tick
    class QuantumOneRR implements IAlgorithm {
      readonly name = 'contract-q1-rr';
      readonly triggers = new Set<PreemptionTrigger>(['on-quantum']);
      readonly requires = { quantum: true };
      private queue: string[] = [];
      select(ready: readonly ReadyProcess[]): ReadyProcess {
        if (ready.length === 0) throw new Error('');
        for (const id of this.queue) {
          const found = ready.find((p) => p.id === id);
          if (found !== undefined) return found;
        }
        const first = ready[0];
        if (first === undefined) throw new Error('');
        return first;
      }
      quantumFor(): number { return 1; }
      onEvent(e: SchedulerEvent): null {
        if (e.type === 'arrival') this.queue.push(e.id);
        if (e.type === 'dispatch') this.queue = this.queue.filter((x) => x !== e.id);
        if (e.type === 'quantum-expiry') this.queue.push(e.id);
        if (e.type === 'completed') this.queue = this.queue.filter((x) => x !== e.id);
        return null;
      }
    }
    register(() => new QuantumOneRR());

    const result = run(
      [
        { id: 'A', arrival_time: 0, burst_time: 2 },
        { id: 'B', arrival_time: 0, burst_time: 2 },
      ],
      { algorithm: 'contract-q1-rr' },
    );

    // Con quantum=1: A[0-1], B[1-2], A[2-3], B[3-4]
    const nonNull = result.intervals.filter((i) => i.pid !== null);
    expect(nonNull).toEqual([
      { pid: 'A', start: 0, end: 1 },
      { pid: 'B', start: 1, end: 2 },
      { pid: 'A', start: 2, end: 3 },
      { pid: 'B', start: 3, end: 4 },
    ]);
  });
});

describe('§ Verificación de contrato de algoritmo (Extensibilidad)', () => {
  it('clase minimal que implementa IAlgorithm funciona correctamente', () => {
    const result = run(PROCESSES, { algorithm: 'contract-minimal-fcfs' });
    const m1 = result.metrics.perProcess.find((m) => m.id === 'P1');
    const m2 = result.metrics.perProcess.find((m) => m.id === 'P2');
    expect(m1).toBeDefined();
    expect(m2).toBeDefined();
  });

  it('onEvent devuelve string plano → motor lo usa literalmente (sin inyectar PID)', () => {
    const result = run(
      [{ id: 'P1', arrival_time: 0, burst_time: 2 }],
      { algorithm: 'contract-rich-message' },
    );
    // El dispatch de P1 en t=0 debería tener el string plano
    const h0 = result.history[0];
    expect(h0?.message).toBe('mensaje plano personalizado');
  });

  it('onEvent devuelve null → motor usa mensaje genérico predeterminado', () => {
    const result = run(
      [{ id: 'P1', arrival_time: 0, burst_time: 2 }],
      { algorithm: 'contract-null-message' },
    );
    const h0 = result.history[0];
    // Mensaje genérico contiene el PID y referencia a CPU
    expect(h0?.message).toContain('P1');
    expect(h0?.message).toContain('CPU');
  });

  it('los 9 algoritmos oficiales son recuperables del registro', () => {
    const names = [
      'fcfs',
      'sjf',
      'ljf',
      'priority-np',
      'srtf',
      'priority-p',
      'round-robin',
      'virtual-round-robin',
      'mlfq',
    ];
    for (const name of names) {
      expect(() => get(name)).not.toThrow();
      expect(get(name).name).toBe(name);
    }
  });
});
