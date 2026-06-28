import React from 'react';
import { useSimulation } from './SimulationContext.js';
import styles from './style/MetricsTable.module.css';

/**
 * Tablas de métricas (por proceso y agregadas).
 * Solo visibles cuando el reproductor está en el último tick.
 */
export function MetricsTable(): React.ReactElement {
  const { result, currentEvent } = useSimulation();

  if (result === null || currentEvent === undefined) {
    return <div data-testid="metrics-table" />;
  }

  const lastTick = result.history.length - 1;
  const atEnd = currentEvent.tick >= lastTick;

  // Solo mostrar métricas en el último tick
  if (!atEnd) {
    return <div data-testid="metrics-table" />;
  }

  const { metrics } = result;

  return (
    <div className={styles.wrapper} data-testid="metrics-table">
      {/* Tabla por proceso */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Métricas por proceso</div>
        <table className={styles.table} data-testid="metrics-per-process">
          <thead>
            <tr>
              <th>ID</th>
              <th className={styles.numeric}>Finalización</th>
              <th className={styles.numeric}>Turnaround</th>
              <th className={styles.numeric}>Espera</th>
              <th className={styles.numeric}>Respuesta</th>
            </tr>
          </thead>
          <tbody>
            {metrics.perProcess.map((m) => (
              <tr key={m.id}>
                <td>{m.id}</td>
                <td className={styles.numeric}>{m.completion}</td>
                <td className={styles.numeric}>{m.turnaround}</td>
                <td className={styles.numeric}>{m.waiting}</td>
                <td className={styles.numeric}>{m.response}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tabla agregada */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Métricas agregadas</div>
        <table className={styles.table} data-testid="metrics-aggregate">
          <thead>
            <tr>
              <th>Métrica</th>
              <th className={styles.numeric}>Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Espera media</td>
              <td className={styles.numeric}>{metrics.aggregate.avgWaiting.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Turnaround medio</td>
              <td className={styles.numeric}>{metrics.aggregate.avgTurnaround.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Utilización CPU</td>
              <td className={styles.numeric}>
                {(metrics.aggregate.cpuUtilization * 100).toFixed(1)}%
              </td>
            </tr>
            <tr>
              <td>Throughput</td>
              <td className={styles.numeric}>{metrics.aggregate.throughput.toFixed(3)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
