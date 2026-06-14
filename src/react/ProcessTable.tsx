import React from 'react';
import { useSimulation } from './SimulationContext.js';
import styles from './style/ProcessTable.module.css';

export function ProcessTable() {
  const { processes, algorithmInfo } = useSimulation();
  const showPriority = algorithmInfo !== null && algorithmInfo.requires.priority === true;
  const showQuantum = algorithmInfo !== null && algorithmInfo.requires.quantum === true;

  return (
    <div>
      {showQuantum && <p>Quantum: configurado</p>}
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
    </div>
  );
}
