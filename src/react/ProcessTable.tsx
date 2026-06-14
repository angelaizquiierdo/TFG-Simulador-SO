// T-26 — Tabla de procesos de entrada
import React from 'react';
import { useSimulation } from './SimulationContext.js';
import styles from './style/ProcessTable.module.css';

export function ProcessTable(): React.ReactElement {
  const { processes, algorithm } = useSimulation();
  const showPriority = algorithm?.requires.priority === true;

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>id</th>
          <th>arrival_time</th>
          <th>burst_time</th>
          {showPriority && <th>priority</th>}
        </tr>
      </thead>
      <tbody>
        {processes.map((p, i) => (
          <tr key={p.id} className={i % 2 === 0 ? styles.even : styles.odd}>
            <td>{p.id}</td>
            <td>{p.arrival_time}</td>
            <td>{p.burst_time}</td>
            {showPriority && <td>{p.priority ?? ''}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
