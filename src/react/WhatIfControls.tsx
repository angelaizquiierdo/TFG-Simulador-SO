import React, { useState } from 'react';
import { useSimulation } from './SimulationContext.js';
import { get, list } from '../core/registry.js';
import type { AggregateMetrics } from '../core/types/simulation-result.js';
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

// Qué campos de parámetros muestra el algoritmo seleccionado para la rama.
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

// Etiqueta legible de la rama: "round-robin · quantum 4".
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
  { label: 'Turnaround medio', format: (v) => v.toFixed(2), pick: (m) => m.avgTurnaround },
  { label: 'Utilización CPU', format: (v) => `${(v * 100).toFixed(1)}%`, pick: (m) => m.cpuUtilization },
  { label: 'Throughput', format: (v) => v.toFixed(3), pick: (m) => m.throughput },
];

/**
 * Panel de análisis "¿y si...?". Solo visible en un tick intermedio
 * (0 < tick_actual < último tick).
 *
 * Sin rama activa: muestra un formulario para elegir un algoritmo y parámetros
 * alternativos. Al pulsar "Comparar" se crea una rama (`createWhatIf`) que
 * rederiva el escenario con esos cambios. Con rama activa: muestra una tabla
 * comparando las métricas agregadas del escenario actual frente a la rama.
 */
export function WhatIfControls(): React.ReactElement | null {
  const { result, currentEvent, whatIfBranch, createWhatIf, discardWhatIf, algorithmName, params } =
    useSimulation();

  const [algorithm, setAlgorithm] = useState(algorithmName);
  const [draft, setDraft] = useState<DraftParams>(() => paramsToDraft(params));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [branchLabel, setBranchLabel] = useState<string | null>(null);

  if (result === null || currentEvent === undefined) return null;

  const lastTick = result.history.length - 1;
  const currentTick = currentEvent.tick;
  if (currentTick <= 0 || currentTick >= lastTick) return null;

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
    return (
      <div data-testid="whatif-controls" className={styles.container}>
        <div className={styles.header}>
          <span className={styles.branchLabel} data-testid="whatif-branch-indicator">
            ¿Y si…? {branchLabel ?? 'rama activa'}
          </span>
          <button
            type="button"
            className={styles.discardButton}
            data-testid="discard-whatif-button"
            onClick={handleDiscard}
          >
            Descartar rama
          </button>
        </div>
        <table className={styles.comparison} data-testid="whatif-comparison">
          <thead>
            <tr>
              <th>Métrica</th>
              <th className={styles.numeric}>Actual</th>
              <th className={styles.numeric}>¿Y si?</th>
              <th className={styles.numeric}>Δ</th>
            </tr>
          </thead>
          <tbody>
            {METRIC_ROWS.map((row) => {
              const a = row.pick(actual);
              const b = row.pick(branch);
              const delta = b - a;
              const sign = delta > 0 ? '+' : '';
              return (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td className={styles.numeric}>{row.format(a)}</td>
                  <td className={styles.numeric}>{row.format(b)}</td>
                  <td className={styles.numeric}>{`${sign}${row.format(delta)}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div data-testid="whatif-controls" className={styles.container}>
      <span className={styles.title}>¿Y si…? Compara un escenario alternativo</span>
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
    </div>
  );
}
