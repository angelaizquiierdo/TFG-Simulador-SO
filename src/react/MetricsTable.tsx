import React from 'react';
import type { ProcessMetrics, AggregateMetrics } from '../core/types/simulation-result.js';

export interface MetricsTableProps {
  perProcess: ProcessMetrics[];
  aggregate: AggregateMetrics;
  /** Lista de columnas a mostrar. Vacío o undefined → no mostrar ninguna. */
  metrics?: string[];
  /** Solo se muestran si atEnd es verdadero */
  atEnd: boolean;
}

const ALL_COLUMNS = ['waiting', 'turnaround', 'response', 'completion'] as const;
type Column = (typeof ALL_COLUMNS)[number];

export function MetricsTable({ perProcess, aggregate, metrics, atEnd }: MetricsTableProps): React.JSX.Element {
  if (!atEnd) {
    return <></>;
  }

  // Si metrics es array vacío, no mostrar nada
  // metrics vacío → sin columnas; undefined → todas
  if (metrics?.length === 0) {
    return <div data-testid="metrics-table-empty" />;
  }

  const showColumns: Column[] =
    metrics !== undefined
      ? ALL_COLUMNS.filter(c => metrics.includes(c))
      : [...ALL_COLUMNS];

  return (
    <div data-testid="metrics-table">
      <table>
        <thead>
          <tr>
            <th>Proceso</th>
            {showColumns.map(c => <th key={c}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {perProcess.map(m => (
            <tr key={m.id} data-testid={`metrics-row-${m.id}`}>
              <td>{m.id}</td>
              {showColumns.map(c => (
                <td key={c} data-testid={`metrics-${m.id}-${c}`}>{m[c]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div data-testid="aggregate-metrics">
        <span data-testid="avg-waiting">{aggregate.avgWaiting.toFixed(2)}</span>
        <span data-testid="avg-turnaround">{aggregate.avgTurnaround.toFixed(2)}</span>
        <span data-testid="cpu-utilization">{(aggregate.cpuUtilization * 100).toFixed(1)}%</span>
        <span data-testid="throughput">{aggregate.throughput.toFixed(2)}</span>
      </div>
    </div>
  );
}
