import React, { useState, useEffect } from 'react';
import { ChevronIcon } from './icons/ChevronIcon.js';
import { useSimulation } from './SimulationContext.js';
import type { AlgorithmRequires } from './SimulationContext.js';
import { get, list } from '../core/registry.js';
import type { AggregateMetrics, ProcessMetrics } from '../core/types/simulation-result.js';
import { GanttChart } from './GanttChart.js';
import { PlaybackControls } from './PlaybackControls.js';
import type { PlaybackController } from './PlaybackControls.js';
import styles from './style/WhatIfControls.module.css';

interface DraftParams {
  quantum: string;
  quantum0: string;
  quantum1: string;
  boostInterval: string;
}

const DEFAULT_QUANTA = [2, 4] as const;

function paramsToDraft(params: Readonly<Record<string, unknown>>): DraftParams {
  const quanta = Array.isArray(params.quanta) ? params.quanta : undefined;
  const q0 = typeof quanta?.[0] === 'number' ? quanta[0] : DEFAULT_QUANTA[0];
  const q1 = typeof quanta?.[1] === 'number' ? quanta[1] : DEFAULT_QUANTA[1];
  return {
    quantum: typeof params.quantum === 'number' ? String(params.quantum) : '',
    quantum0: String(q0),
    quantum1: String(q1),
    boostInterval: typeof params.boostInterval === 'number' ? String(params.boostInterval) : '',
  };
}

interface FieldVisibility {
  readonly showQuanta: boolean;
  readonly showQuantum: boolean;
  readonly showBoost: boolean;
}

function visibilityFor(algorithm: string): FieldVisibility {
  const requires = get(algorithm).requires;
  const showQuanta = requires.levels === true;
  return {
    showQuanta,
    showQuantum: requires.quantum === true && !showQuanta,
    showBoost: showQuanta,
  };
}

interface BuildResult {
  readonly errors: Record<string, string>;
  readonly params: Readonly<Record<string, unknown>> | null;
}

function buildParams(draft: DraftParams, vis: FieldVisibility): BuildResult {
  const errors: Record<string, string> = {};
  const result: Record<string, unknown> = {};

  if (vis.showQuantum && draft.quantum !== '') {
    const q = Number(draft.quantum);
    if (!Number.isFinite(q) || q <= 0) errors.quantum = 'quantum debe ser un entero positivo';
    else result.quantum = q;
  }

  if (vis.showQuanta) {
    const q0 = Number(draft.quantum0);
    const q1 = Number(draft.quantum1);
    if (draft.quantum0 === '' || !Number.isFinite(q0) || q0 <= 0) {
      errors.quantum0 = 'el quantum del nivel 0 debe ser un entero positivo';
    }
    if (draft.quantum1 === '' || !Number.isFinite(q1) || q1 <= 0) {
      errors.quantum1 = 'el quantum del nivel 1 debe ser un entero positivo';
    }
    if (errors.quantum0 === undefined && errors.quantum1 === undefined) {
      result.quanta = [q0, q1];
    }
  }

  if (vis.showBoost && draft.boostInterval !== '') {
    const b = Number(draft.boostInterval);
    if (!Number.isFinite(b) || b <= 0) errors.boostInterval = 'boostInterval debe ser un entero positivo';
    else result.boostInterval = b;
  }

  if (Object.keys(errors).length > 0) return { errors, params: null };
  return { errors: {}, params: result };
}

function describeBranch(algorithm: string, params: Readonly<Record<string, unknown>>): string {
  const parts: string[] = [];
  if (typeof params.quantum === 'number') parts.push(`quantum ${String(params.quantum)}`);
  if (Array.isArray(params.quanta)) parts.push(`quanta [${params.quanta.map(String).join(', ')}]`);
  if (typeof params.boostInterval === 'number') parts.push(`boost ${String(params.boostInterval)}`);
  return parts.length > 0 ? `${algorithm} · ${parts.join(' · ')}` : algorithm;
}

interface MetricRow {
  readonly label: string;
  readonly format: (v: number) => string;
  readonly pick: (m: AggregateMetrics) => number;
}

const METRIC_ROWS: readonly MetricRow[] = [
  { label: 'Espera media', format: (v) => v.toFixed(2), pick: (m) => m.avgWaiting },
  { label: 'Tiempo de retorno medio', format: (v) => v.toFixed(2), pick: (m) => m.avgTurnaround },
  { label: 'Utilización CPU', format: (v) => `${(v * 100).toFixed(1)}%`, pick: (m) => m.cpuUtilization },
  { label: 'Rendimiento', format: (v) => v.toFixed(3), pick: (m) => m.throughput },
];

function requiresOf(algorithm: string): AlgorithmRequires {
  try {
    return get(algorithm).requires;
  } catch {
    return {};
  }
}

interface ProcessCompareRow {
  readonly id: string;
  readonly waitingA: number;
  readonly waitingB: number;
  readonly turnaroundA: number;
  readonly turnaroundB: number;
}

function buildProcessRows(
  actual: readonly ProcessMetrics[],
  branch: readonly ProcessMetrics[],
): readonly ProcessCompareRow[] {
  const byId = new Map(branch.map((m) => [m.id, m] as const));
  return actual.map((a) => {
    const b = byId.get(a.id);
    return {
      id: a.id,
      waitingA: a.waiting,
      waitingB: b?.waiting ?? a.waiting,
      turnaroundA: a.turnaround,
      turnaroundB: b?.turnaround ?? a.turnaround,
    };
  });
}

function fmtSignedDelta(delta: number, format: (n: number) => string = String): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${format(delta)}`;
}

/** Panel de análisis "¿y si...?". */
export function WhatIfControls(): React.ReactElement | null {
  const {
    result,
    currentEvent,
    whatIfBranch,
    createWhatIf,
    discardWhatIf,
    algorithmName,
    params,
    processes,
  } = useSimulation();

  const [algorithm, setAlgorithm] = useState(algorithmName);
  const [draft, setDraft] = useState<DraftParams>(() => paramsToDraft(params));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [branchLabel, setBranchLabel] = useState<string | null>(null);
  const [branchTick, setBranchTick] = useState(0);

  const branchLast = whatIfBranch !== null ? whatIfBranch.result.history.length - 1 : 0;
  useEffect(() => {
    setBranchTick(branchLast);
  }, [whatIfBranch, branchLast]);

  if (result === null || currentEvent === undefined) return null;

  const algorithms = list();
  const vis = visibilityFor(algorithm);

  function handleCompare(): void {
    const { errors: errs, params: parsed } = buildParams(draft, vis);
    setErrors(errs);
    if (parsed === null) return;
    createWhatIf({ algorithm, params: parsed });
    setBranchLabel(describeBranch(algorithm, parsed));
  }

  function handleDiscard(): void {
    discardWhatIf();
    setBranchLabel(null);
    setErrors({});
  }

  if (whatIfBranch !== null) {
    const actual = result.metrics.aggregate;
    const branch = whatIfBranch.result.metrics.aggregate;
    const branchHistory = whatIfBranch.result.history;
    const branchAlgorithm = whatIfBranch.algorithm;
    const branchRequires = requiresOf(branchAlgorithm);
    const safeBranchTick = Math.min(Math.max(branchTick, 0), branchLast);
    const branchController: PlaybackController = {
      currentTick: safeBranchTick,
      lastTick: branchLast,
      hasHistory: branchHistory.length > 0,
      stepForward: () => { setBranchTick((t) => Math.min(t + 1, branchLast)); },
      stepBackward: () => { setBranchTick((t) => Math.max(t - 1, 0)); },
      seekTo: (n) => { setBranchTick(Math.max(0, Math.min(n, branchLast))); },
    };
    const branchLabelText = `Comparado con ${branchAlgorithm}`;
    const processRows = buildProcessRows(
      result.metrics.perProcess,
      whatIfBranch.result.metrics.perProcess,
    );
    return (
      <details data-testid="whatif-controls" className={styles.container} open>
        <summary className={styles.panelSummary}>
          <ChevronIcon />
          <span className={styles.branchLabel} data-testid="whatif-branch-indicator">
            {branchLabel !== null ? `Comparar · ${branchLabel}` : 'Comparar'}
          </span>
          <button
            type="button"
            className={styles.discardButton}
            data-testid="discard-whatif-button"
            onClick={(e) => { e.stopPropagation(); handleDiscard(); }}
          >
            Descartar rama
          </button>
        </summary>
        <details className={styles.section} data-testid="whatif-gantt-comparison" open>
          <summary className={styles.summary}><ChevronIcon /> Diagrama de Gantt comparativo </summary>
          <div className={styles.ganttBlock} data-testid="whatif-gantt-branch">
            <span className={styles.subTitle}>{branchLabelText}</span>
            <GanttChart
              history={branchHistory}
              processes={processes}
              requires={branchRequires}
              currentTick={safeBranchTick}
              message={branchHistory[safeBranchTick]?.message ?? ''}
              testId="whatif-gantt-branch-chart"
            />
          </div>
          <PlaybackControls controller={branchController} testId="whatif-playback" />
        </details>

        {/* 2. Comparación de métricas por proceso */}
        <details className={styles.section} data-testid="whatif-comparison-per-process">
          <summary className={styles.summary}><ChevronIcon /> Métricas por proceso — comparación</summary>
          <table className={styles.comparison} data-testid="whatif-per-process-table">
            <thead>
              <tr>
                <th>Proceso</th>
                <th className={styles.numeric}>Espera ({algorithmName})</th>
                <th className={styles.numeric}>Espera ({branchAlgorithm})</th>
                <th className={styles.numeric}>Δ esp.</th>
                <th className={styles.numeric}>Turn. ({algorithmName})</th>
                <th className={styles.numeric}>Turn. ({branchAlgorithm})</th>
                <th className={styles.numeric}>Δ turn.</th>
              </tr>
            </thead>
            <tbody>
              {processRows.map((row) => (
                <tr key={row.id} data-testid={`whatif-per-process-row-${row.id}`}>
                  <td>{row.id}</td>
                  <td className={styles.numeric}>{row.waitingA}</td>
                  <td className={styles.numeric}>{row.waitingB}</td>
                  <td className={styles.numeric}>{fmtSignedDelta(row.waitingB - row.waitingA)}</td>
                  <td className={styles.numeric}>{row.turnaroundA}</td>
                  <td className={styles.numeric}>{row.turnaroundB}</td>
                  <td className={styles.numeric}>{fmtSignedDelta(row.turnaroundB - row.turnaroundA)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>

        {/* 3. Comparación de métricas agregadas */}
        <details className={styles.section} data-testid="whatif-comparison-aggregate" open>
          <summary className={styles.summary}><ChevronIcon /> Métricas agregadas — comparación</summary>
          <table className={styles.comparison} data-testid="whatif-comparison">
            <thead>
              <tr>
                <th>Métrica</th>
                <th className={styles.numeric}>{algorithmName}</th>
                <th className={styles.numeric}>{branchLabelText}</th>
                <th className={styles.numeric}>Δ</th>
              </tr>
            </thead>
            <tbody>
              {METRIC_ROWS.map((row) => {
                const a = row.pick(actual);
                const b = row.pick(branch);
                const delta = b - a;
                return (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td className={styles.numeric}>{row.format(a)}</td>
                    <td className={styles.numeric}>{row.format(b)}</td>
                    <td className={styles.numeric}>{fmtSignedDelta(delta, row.format)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </details>
      </details>
    );
  }

  return (
    <details data-testid="whatif-controls" className={styles.container} open>
      <summary className={styles.panelSummary}>
        <ChevronIcon />
        <span className={styles.title}>Comparar con otro escenario</span>
      </summary>
      <div className={styles.form} data-testid="whatif-form">
        <label className={styles.field}>
          <span>Algoritmo</span>
          <select
            className={styles.select}
            value={algorithm}
            data-testid="whatif-algorithm-select"
            onChange={(e) => {
              setAlgorithm(e.target.value);
              setErrors({});
            }}
          >
            {algorithms.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        {vis.showQuantum && (
          <label className={styles.field}>
            <span>Quantum</span>
            <input
              type="number"
              min={1}
              value={draft.quantum}
              data-testid="whatif-input-quantum"
              onChange={(e) => {
                setDraft((prev) => ({ ...prev, quantum: e.target.value }));
              }}
            />
            {errors.quantum !== undefined && (
              <span className={styles.error} role="alert">
                {errors.quantum}
              </span>
            )}
          </label>
        )}

        {vis.showQuanta && (
          <>
            <label className={styles.field}>
              <span>Quantum nivel 0</span>
              <input
                type="number"
                min={1}
                value={draft.quantum0}
                data-testid="whatif-input-quantum-0"
                onChange={(e) => {
                  setDraft((prev) => ({ ...prev, quantum0: e.target.value }));
                }}
              />
              {errors.quantum0 !== undefined && (
                <span className={styles.error} role="alert">
                  {errors.quantum0}
                </span>
              )}
            </label>
            <label className={styles.field}>
              <span>Quantum nivel 1</span>
              <input
                type="number"
                min={1}
                value={draft.quantum1}
                data-testid="whatif-input-quantum-1"
                onChange={(e) => {
                  setDraft((prev) => ({ ...prev, quantum1: e.target.value }));
                }}
              />
              {errors.quantum1 !== undefined && (
                <span className={styles.error} role="alert">
                  {errors.quantum1}
                </span>
              )}
            </label>
          </>
        )}

        {vis.showBoost && (
          <label className={styles.field}>
            <span>Boost interval (vacío = sin boost)</span>
            <input
              type="number"
              min={1}
              value={draft.boostInterval}
              placeholder="sin boost"
              data-testid="whatif-input-boost"
              onChange={(e) => {
                setDraft((prev) => ({ ...prev, boostInterval: e.target.value }));
              }}
            />
            {errors.boostInterval !== undefined && (
              <span className={styles.error} role="alert">
                {errors.boostInterval}
              </span>
            )}
          </label>
        )}

        <button
          type="button"
          className={styles.compareButton}
          data-testid="whatif-compare-button"
          onClick={handleCompare}
        >
          Comparar
        </button>
      </div>
    </details>
  );
}
