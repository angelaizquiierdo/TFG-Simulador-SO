import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { Simulator } from '../../src/react/Simulator.js';

afterEach(cleanup);

const fcfsProcesses = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 2, burst_time: 2 },
];

const priorityProcesses = [
  { id: 'P1', arrival_time: 0, burst_time: 3, priority: 2 },
  { id: 'P2', arrival_time: 0, burst_time: 1, priority: 1 },
];

describe('T-29 — Campos declarados por requires', () => {
  it('BEHAVIOURS § Página FCFS: no muestra campo priority', () => {
    render(<Simulator algorithm="fcfs" processes={fcfsProcesses} />);
    expect(screen.queryByTestId('priority-field')).not.toBeInTheDocument();
  });

  it('BEHAVIOURS § Página Priority-NP: muestra campo priority', () => {
    render(<Simulator algorithm="priority-np" processes={priorityProcesses} />);
    expect(screen.getByTestId('priority-field')).toBeInTheDocument();
  });

  it('BEHAVIOURS § Página Round Robin: muestra campo quantum', () => {
    render(
      <Simulator
        algorithm="round-robin"
        processes={fcfsProcesses}
        params={{ quantum: 2 }}
      />,
    );
    expect(screen.getByTestId('quantum-field')).toBeInTheDocument();
    expect(screen.getByTestId('quantum-field')).toHaveTextContent('2');
  });
});
