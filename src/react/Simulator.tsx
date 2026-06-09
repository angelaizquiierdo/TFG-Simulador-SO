import React, { useState, useMemo } from 'react';
import { run } from '../core/simulate.js';
import { Player } from '../core/player.js';
import { get, register } from '../core/registry.js';
import type { Process } from '../core/types/process.js';
import type { SimulationResult } from '../core/types/simulation-result.js';
import type { HistoryEvent } from '../core/types/history.js';

// Registrar algoritmos integrados al cargar el módulo
import { FCFS } from '../core/algorithms/non-preemptive/fcfs.js';
import { SJF } from '../core/algorithms/non-preemptive/sjf.js';
import { LJF } from '../core/algorithms/non-preemptive/ljf.js';
import { PriorityNP } from '../core/algorithms/non-preemptive/priority-np.js';
import { SRTF } from '../core/algorithms/preemptive/srtf.js';
import { PriorityP } from '../core/algorithms/preemptive/priority-p.js';
import { RoundRobin } from '../core/algorithms/preemptive/round-robin.js';

const builtins = [
  new FCFS(), new SJF(), new LJF(), new PriorityNP(),
  new SRTF(), new PriorityP(), new RoundRobin(),
];
for (const algo of builtins) {
  try { register(algo); } catch { /* ya registrado */ }
}

export interface SimulatorProps {
  algorithm: string;
  processes: Process[];
  params?: { quantum?: number };
  metrics?: string[];
}

interface SimulatorState {
  result: SimulationResult;
  player: Player;
  currentTick: number;
  current: HistoryEvent | undefined;
}

export function Simulator({ algorithm, processes, params, metrics }: SimulatorProps): React.JSX.Element {
  // Calcular el error de configuración antes de simular
  const configError = useMemo(() => {
    for (const p of processes) {
      if (p.burst_time <= 0) return 'La ráfaga debe ser mayor que 0';
    }
    return null;
  }, [processes]);

  // Calcular resultado de simulación
  const simState = useMemo((): SimulatorState | null => {
    if (configError !== null) return null;
    if (processes.length === 0) return null;
    try {
      const algo = get(algorithm);
      const result = run(processes, algo, params ?? {});
      const player = new Player(result.history);
      return {
        result,
        player,
        currentTick: 0,
        current: result.history[0],
      };
    } catch {
      return null;
    }
  }, [algorithm, processes, params, configError]);

  const [tick, setTick] = useState(0);

  const player = simState?.player;
  const result = simState?.result;
  const totalTicks = result ? result.history.length - 1 : 0;

  const currentEvent = result?.history[tick];
  const atEnd = result ? tick === totalTicks : false;
  const algo = useMemo(() => {
    try { return get(algorithm); } catch { return null; }
  }, [algorithm]);

  if (configError !== null) {
    return <div role="alert">{configError}</div>;
  }

  if (processes.length === 0 || !result || !player) {
    return <div data-testid="empty-state">Sin procesos configurados</div>;
  }

  return (
    <div data-testid="simulator">
      <div data-testid="gantt">
        {result.intervals.map((interval, i) => (
          <span key={i} data-testid={`interval-${interval.pid ?? 'idle'}-${String(interval.start)}-${String(interval.end)}`}>
            {interval.pid ?? 'Inactivo'}[{interval.start}–{interval.end}]
          </span>
        ))}
      </div>

      <div data-testid="playback-controls">
        <input
          type="range"
          min={0}
          max={totalTicks}
          value={tick}
          onChange={e => { setTick(Number(e.target.value)); }}
          aria-label="Barra de tiempo"
        />
        <button onClick={() => { setTick(t => Math.max(0, t - 1)); }}>Atrás</button>
        <button onClick={() => { setTick(t => Math.min(totalTicks, t + 1)); }}>Adelante</button>
      </div>

      {currentEvent && (
        <div data-testid="current-state">
          <span>Tick: {currentEvent.tick}</span>
          <span>CPU: {currentEvent.onCPU ?? 'Inactiva'}</span>
        </div>
      )}

      {algo?.requires.priority === true && (
        <div data-testid="priority-field">Prioridad activada</div>
      )}
      {algo?.requires.quantum === true && (
        <div data-testid="quantum-field">
          Quantum: {params?.quantum ?? 1}
        </div>
      )}

      {atEnd && result.metrics.perProcess.length > 0 && (
        <div data-testid="metrics-table">
          {result.metrics.perProcess
            .filter(m => !metrics || metrics.length === 0 || metrics.includes(m.id))
            .map(m => (
              <div key={m.id} data-testid={`metric-${m.id}`}>
                {m.id}: espera={m.waiting} retorno={m.turnaround}
              </div>
            ))}
          <div data-testid="aggregate-metrics">
            Espera media: {result.metrics.aggregate.avgWaiting.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}
