// T-29 — Tabla de métricas (solo visible al final)
import React from 'react';
import { useSimulation } from './SimulationContext.js';
import styles from './style/MetricsTable.module.css';

export function MetricsTable(): React.ReactElement | null {
  const { result, atEnd } = useSimulation();

  if (!atEnd || result === null) return null;

  const { perProcess, aggregate } = result.metrics;

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>id</th>
            <th>completion</th>
            <th>turnaround</th>
            <th>waiting</th>
            <th>response</th>
          </tr>
        </thead>
        <tbody>
          {perProcess.map((m, i) => (
            <tr key={m.id} className={i % 2 === 0 ? styles.even : styles.odd}>
              <td>{m.id}</td>
              <td>{m.completion}</td>
              <td>{m.turnaround}</td>
              <td>{m.waiting}</td>
              <td>{m.response}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>avgWaiting</th>
            <th>avgTurnaround</th>
            <th>cpuUtilization</th>
            <th>throughput</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{aggregate.avgWaiting.toFixed(2)}</td>
            <td>{aggregate.avgTurnaround.toFixed(2)}</td>
            <td>{aggregate.cpuUtilization.toFixed(2)}</td>
            <td>{aggregate.throughput.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
