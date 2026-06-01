import { describe, it, expect } from 'vitest';
import {
  crearProceso,
  inicializarControlProceso,
  crearPasoInicial,
} from '../../utils/procesoUtils';
import type { Proceso, ProcesoControlFinal, EstadoPaso } from '../proceso';

describe('Proceso - crearProceso', () => {
  it('Debe crear un proceso válido con los campos obligatorios', () => {
    const proceso = crearProceso(
      {
        id: 'P1',
        tiempoLlegada: 0,
        tiempoCPU: 5,
        color: '#FF0000',
      },
      []
    );

    expect(proceso.id).toBe('P1');
    expect(proceso.tiempoLlegada).toBe(0);
    expect(proceso.tiempoCPU).toBe(5);
    expect(proceso.color).toBe('#FF0000');
  });

  it('Debe asignar un color por defecto si no se proporciona', () => {
    const proceso = crearProceso(
      {
        id: 'P2',
        tiempoLlegada: 2,
        tiempoCPU: 3,
      },
      []
    );

    expect(proceso.color).toBeDefined();
    expect(typeof proceso.color).toBe('string');
    expect(proceso.color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('Debe lanzar error si tiempoCPU es negativo', () => {
    expect(() => {
      crearProceso(
        {
          id: 'P3',
          tiempoLlegada: 0,
          tiempoCPU: -5,
          color: '#FF0000',
        },
        []
      );
    }).toThrow();
  });

  it('Debe lanzar error si tiempoLlegada es negativo', () => {
    expect(() => {
      crearProceso(
        {
          id: 'P4',
          tiempoLlegada: -1,
          tiempoCPU: 5,
          color: '#FF0000',
        },
        []
      );
    }).toThrow();
  });

  it('Debe aceptar y guardar correctamente los campos opcionales (prioridad, E/S)', () => {
    const proceso = crearProceso(
      {
        id: 'P5',
        tiempoLlegada: 1,
        tiempoCPU: 4,
        color: '#00FF00',
        prioridad: 2,
        tiempoLlegadaES: 2,
        tiempoES: 1,
      },
      []
    );

    expect(proceso.prioridad).toBe(2);
    expect(proceso.tiempoLlegadaES).toBe(2);
    expect(proceso.tiempoES).toBe(1);
  });

  it('Debe lanzar error si el ID ya existe en procesos existentes', () => {
    const procesoExistente = crearProceso(
      {
        id: 'P1',
        tiempoLlegada: 0,
        tiempoCPU: 5,
        color: '#FF0000',
      },
      []
    );

    expect(() => {
      crearProceso(
        {
          id: 'P1',
          tiempoLlegada: 2,
          tiempoCPU: 3,
          color: '#00FF00',
        },
        [procesoExistente]
      );
    }).toThrow(/ya existe/);
  });
});

describe('ProcesoControlFinal - inicializarControlProceso', () => {
  it('Debe inicializar tiempoRestante igual a tiempoCPU', () => {
    const proceso = crearProceso(
      {
        id: 'P1',
        tiempoLlegada: 0,
        tiempoCPU: 8,
        color: '#FF0000',
      },
      []
    );

    const control = inicializarControlProceso(proceso);

    expect(control.tiempoRestante).toBe(8);
    expect(control.tiempoRestante).toBe(control.tiempoCPU);
  });

  it('Los tiempos de fin, retorno y espera deben inicializarse como undefined', () => {
    const proceso = crearProceso(
      {
        id: 'P2',
        tiempoLlegada: 1,
        tiempoCPU: 5,
        color: '#00FF00',
      },
      []
    );

    const control = inicializarControlProceso(proceso);

    expect(control.tiempoFin).toBeUndefined();
    expect(control.tiempoRetorno).toBeUndefined();
    expect(control.tiempoEspera).toBeUndefined();
  });

  it('Debe heredar correctamente el id y color del proceso original', () => {
    const proceso = crearProceso(
      {
        id: 'P3',
        tiempoLlegada: 2,
        tiempoCPU: 6,
        color: '#0000FF',
      },
      []
    );

    const control = inicializarControlProceso(proceso);

    expect(control.id).toBe('P3');
    expect(control.color).toBe('#0000FF');
  });

  it('Al simular un tick (restar 1 a tiempoRestante), el objeto debe reflejar el cambio sin alterar el tiempoCPU original', () => {
    const proceso = crearProceso(
      {
        id: 'P4',
        tiempoLlegada: 0,
        tiempoCPU: 10,
        color: '#FFFF00',
      },
      []
    );

    const control = inicializarControlProceso(proceso);
    const tiempoCPUOriginal = control.tiempoCPU;

    control.tiempoRestante -= 1;

    expect(control.tiempoRestante).toBe(9);
    expect(control.tiempoCPU).toBe(tiempoCPUOriginal);
    expect(control.tiempoCPU).toBe(10);
  });
});

describe('EstadoPaso - crearPasoInicial', () => {
  it('El paso inicial en tiempoActual = 0 debe tener procesoEnEjecucion = null', () => {
    const procesos = [
      crearProceso(
        {
          id: 'P1',
          tiempoLlegada: 0,
          tiempoCPU: 5,
          color: '#FF0000',
        },
        []
      ),
      crearProceso(
        {
          id: 'P2',
          tiempoLlegada: 2,
          tiempoCPU: 3,
          color: '#00FF00',
        },
        []
      ),
    ];

    const paso = crearPasoInicial(procesos);

    expect(paso.tiempoActual).toBe(0);
    expect(paso.procesoEnEjecucion).toBeNull();
  });

  it('Todos los procesos cuyo tiempoLlegada > 0 deben estar en estado not-arrived', () => {
    const procesos = [
      crearProceso(
        {
          id: 'P1',
          tiempoLlegada: 0,
          tiempoCPU: 5,
          color: '#FF0000',
        },
        []
      ),
      crearProceso(
        {
          id: 'P2',
          tiempoLlegada: 3,
          tiempoCPU: 4,
          color: '#00FF00',
        },
        []
      ),
      crearProceso(
        {
          id: 'P3',
          tiempoLlegada: 5,
          tiempoCPU: 2,
          color: '#0000FF',
        },
        []
      ),
    ];

    const paso = crearPasoInicial(procesos);

    const p2Estado = paso.estadosProcesos.find((e) => e.id === 'P2');
    const p3Estado = paso.estadosProcesos.find((e) => e.id === 'P3');

    expect(p2Estado?.estado).toBe('not-arrived');
    expect(p3Estado?.estado).toBe('not-arrived');
  });

  it('El array de gantt debe inicializarse vacío', () => {
    const procesos = [
      crearProceso(
        {
          id: 'P1',
          tiempoLlegada: 0,
          tiempoCPU: 5,
          color: '#FF0000',
        },
        []
      ),
    ];

    const paso = crearPasoInicial(procesos);

    expect(paso.gantt).toEqual([]);
    expect(Array.isArray(paso.gantt)).toBe(true);
    expect(paso.gantt.length).toBe(0);
  });

  it('La colaListos debe incluir solo los IDs de los procesos que tienen tiempoLlegada === 0', () => {
    const procesos = [
      crearProceso(
        {
          id: 'P1',
          tiempoLlegada: 0,
          tiempoCPU: 5,
          color: '#FF0000',
        },
        []
      ),
      crearProceso(
        {
          id: 'P2',
          tiempoLlegada: 0,
          tiempoCPU: 3,
          color: '#00FF00',
        },
        []
      ),
      crearProceso(
        {
          id: 'P3',
          tiempoLlegada: 2,
          tiempoCPU: 4,
          color: '#0000FF',
        },
        []
      ),
    ];

    const paso = crearPasoInicial(procesos);

    expect(paso.colaListos).toContain('P1');
    expect(paso.colaListos).toContain('P2');
    expect(paso.colaListos).not.toContain('P3');
    expect(paso.colaListos.length).toBe(2);
  });
});

