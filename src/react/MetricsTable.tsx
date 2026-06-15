import React from 'react';
import { useSimulation } from './SimulationContext.js';
import styles from './style/MetricsTable.module.css';

function r2(n: number): string {
  return n.toFixed(2);
}

export function MetricsTable(): React.ReactElement | null {
  const { result, currentEvent } = useSimulation();

  if (result === null) return null;

  const lastTick = result.history.length - 1;
  const currentTick = currentEvent?.tick ?? 0;

  // Solo visible en el último tick
  if (currentTick < lastTick) return null;

  const { perProcess, aggregate } = result.metrics;

  return (
    <div className={styles.section}>
      <div className={styles.title}>Métricas por proceso</div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Finalización</th>
            <th>Retorno</th>
            <th>Espera</th>
            <th>Respuesta</th>
          </tr>
        </thead>
        <tbody>
          {perProcess.map((m) => (
            <tr key={m.id}>
              <td>{m.id}</td>
              <td>{m.completion}</td>
              <td>{m.turnaround}</td>
              <td>{m.waiting}</td>
              <td>{m.response}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.title}>Métricas agregadas</div>
      <table className={styles.table}>
        <tbody>
          <tr>
            <th>Espera media</th>
            <td>{r2(aggregate.avgWaiting)}</td>
          </tr>
          <tr>
            <th>Retorno medio</th>
            <td>{r2(aggregate.avgTurnaround)}</td>
          </tr>
          <tr>
            <th>Utilización CPU</th>
            <td>{r2(aggregate.cpuUtilization * 100)} %</td>
          </tr>
          <tr>
            <th>Rendimiento</th>
            <td>{r2(aggregate.throughput)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
