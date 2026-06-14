import React from 'react';
import { useSimulation } from './SimulationContext.js';
import styles from './style/MetricsTable.module.css';

export function MetricsTable() {
  const { result, atEnd } = useSimulation();

  if (!atEnd || result === null) {
    return null;
  }

  const { perProcess, aggregate } = result.metrics;

  return (
    <div className={styles.container}>
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
          {perProcess.map(m => (
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

      <table className={styles.table}>
        <tbody>
          <tr><th>avgWaiting</th><td>{aggregate.avgWaiting.toFixed(2)}</td></tr>
          <tr><th>avgTurnaround</th><td>{aggregate.avgTurnaround.toFixed(2)}</td></tr>
          <tr><th>cpuUtilization</th><td>{aggregate.cpuUtilization.toFixed(2)}</td></tr>
          <tr><th>throughput</th><td>{aggregate.throughput.toFixed(4)}</td></tr>
        </tbody>
      </table>
    </div>
  );
}
