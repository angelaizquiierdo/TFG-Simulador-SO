import React from 'react';
import { useSimulation } from './SimulationContext.js';

export function MetricsTable(): React.ReactElement {
  const { result, atEnd } = useSimulation();

  // Solo visible en el último tick y cuando hay resultado
  if (!atEnd || result === null) {
    return <div />;
  }

  const { processes, aggregate } = result.metrics;

  const thStyle: React.CSSProperties = {
    border: '1px solid #ccc',
    padding: '4px 8px',
    textAlign: 'left',
    background: '#f0f0f0',
  };
  const tdStyle: React.CSSProperties = {
    border: '1px solid #ccc',
    padding: '4px 8px',
  };

  return (
    <div>
      <h3>Métricas por proceso</h3>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={thStyle}>id</th>
            <th style={thStyle}>completion</th>
            <th style={thStyle}>turnaround</th>
            <th style={thStyle}>waiting</th>
            <th style={thStyle}>response</th>
          </tr>
        </thead>
        <tbody>
          {processes.map((m) => (
            <tr key={m.id}>
              <td style={tdStyle}>{m.id}</td>
              <td style={tdStyle}>{m.completion}</td>
              <td style={tdStyle}>{m.turnaround}</td>
              <td style={tdStyle}>{m.waiting}</td>
              <td style={tdStyle}>{m.response}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Métricas agregadas</h3>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={thStyle}>avgWaiting</th>
            <th style={thStyle}>avgTurnaround</th>
            <th style={thStyle}>cpuUtilization</th>
            <th style={thStyle}>throughput</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>{aggregate.avgWaiting}</td>
            <td style={tdStyle}>{aggregate.avgTurnaround}</td>
            <td style={tdStyle}>{aggregate.cpuUtilization}</td>
            <td style={tdStyle}>{aggregate.throughput}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
