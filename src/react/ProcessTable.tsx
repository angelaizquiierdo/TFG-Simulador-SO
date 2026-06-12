import React from 'react';
import { useSimulation } from './SimulationContext.js';

export function ProcessTable(): React.ReactElement {
  const { processes, algorithm } = useSimulation();
  const showPriority = algorithm.requires.priority === true;

  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr>
          <th style={thStyle}>id</th>
          <th style={thStyle}>arrival_time</th>
          <th style={thStyle}>burst_time</th>
          {showPriority && <th style={thStyle}>priority</th>}
        </tr>
      </thead>
      <tbody>
        {processes.map((p, i) => (
          <tr key={p.id} style={{ background: i % 2 === 0 ? '#f9f9f9' : '#ffffff' }}>
            <td style={tdStyle}>{p.id}</td>
            <td style={tdStyle}>{p.arrival_time}</td>
            <td style={tdStyle}>{p.burst_time}</td>
            {showPriority && <td style={tdStyle}>{p.priority}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const cellStyle: React.CSSProperties = { border: '1px solid #ccc', padding: '4px 8px' };
const thStyle: React.CSSProperties = { ...cellStyle, textAlign: 'left' };
const tdStyle: React.CSSProperties = { ...cellStyle };
