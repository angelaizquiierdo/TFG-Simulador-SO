import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { GanttChart } from '../../src/react/GanttChart.js';

afterEach(cleanup);

describe('T-26 — GanttChart', () => {
  it('muestra los intervalos del ejemplo FCFS: P1[0–3] y P2[3–5]', () => {
    const intervals = [
      { pid: 'P1', start: 0, end: 3 },
      { pid: 'P2', start: 3, end: 5 },
    ];
    render(<GanttChart intervals={intervals} />);
    expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    expect(screen.getByTestId('gantt-P1-0-3')).toBeInTheDocument();
    expect(screen.getByTestId('gantt-P2-3-5')).toBeInTheDocument();
  });

  it('distingue huecos de inactividad (pid null)', () => {
    const intervals = [
      { pid: null, start: 0, end: 2 },
      { pid: 'P1', start: 2, end: 4 },
    ];
    render(<GanttChart intervals={intervals} />);
    const idleSpan = screen.getByTestId('gantt-idle-0-2');
    expect(idleSpan).toBeInTheDocument();
    expect(idleSpan).toHaveAttribute('data-idle', 'true');
    expect(screen.getByTestId('gantt-P1-2-4')).toBeInTheDocument();
  });
});
