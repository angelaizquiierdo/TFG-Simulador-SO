/**
 * @file proceso.test.ts
 * @description Suite de pruebas unitarias (TDD) para las utilidades de los modelos
 * de datos base. Cubre los caminos felices y todas las ramas de validación/error.
 */

import { describe, it, expect } from 'vitest';
import {
  type Proceso,
  type ProcesoControlFinal,
  NombreEstadoProceso,
} from '../proceso';
import {
  crearProceso,
  inicializarControlProceso,
  crearPasoInicial,
} from '../../utils/procesoUtils';

// ---------------------------------------------------------------------------
// Pruebas para Proceso (crearProceso)
// ---------------------------------------------------------------------------
describe('crearProceso (Proceso)', () => {
  it('1. crea un proceso válido con los campos obligatorios', () => {
    const p = crearProceso({ id: 'P1', tiempoLlegada: 0, tiempoCPU: 5 }, []);
    expect(p.id).toBe('P1');
    expect(p.tiempoLlegada).toBe(0);
    expect(p.tiempoCPU).toBe(5);
    expect(typeof p.color).toBe('string');
    expect(p.color.length).toBeGreaterThan(0);
  });

  it('2. asigna un color por defecto si no se proporciona', () => {
    const sinColor = crearProceso({ id: 'P1', tiempoLlegada: 0, tiempoCPU: 3 }, []);
    expect(sinColor.color).toMatch(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);

    const conColor = crearProceso(
      { id: 'P2', tiempoLlegada: 0, tiempoCPU: 3, color: '#123456' },
      [sinColor],
    );
    expect(conColor.color).toBe('#123456');
  });

  it('3. lanza error si tiempoLlegada es -1', () => {
    expect(() => crearProceso({ id: 'P1', tiempoLlegada: -1, tiempoCPU: 5 }, [])).toThrow();
  });

  it('4. lanza error si tiempoCPU es 0', () => {
    expect(() => crearProceso({ id: 'P1', tiempoLlegada: 0, tiempoCPU: 0 }, [])).toThrow();
  });

  it('5. acepta y guarda correctamente los campos opcionales (prioridad, E/S)', () => {
    const p = crearProceso(
      {
        id: 'P1',
        tiempoLlegada: 2,
        tiempoCPU: 8,
        prioridad: 1,
        tiempoLlegadaES: 3,
        tiempoES: 4,
      },
      [],
    );
    expect(p.prioridad).toBe(1);
    expect(p.tiempoLlegadaES).toBe(3);
    expect(p.tiempoES).toBe(4);
  });

  it('6. lanza error al asignar un id vacío, con solo espacios o ya existente', () => {
    // id vacío
    expect(() => crearProceso({ id: '', tiempoLlegada: 0, tiempoCPU: 5 }, [])).toThrow();
    // id con solo espacios
    expect(() => crearProceso({ id: '   ', tiempoLlegada: 0, tiempoCPU: 5 }, [])).toThrow();
    // id ya existente en procesosExistentes
    const existente = crearProceso({ id: 'P1', tiempoLlegada: 0, tiempoCPU: 5 }, []);
    expect(() => crearProceso({ id: 'P1', tiempoLlegada: 0, tiempoCPU: 2 }, [existente])).toThrow();
  });

  it('7. recurre al color de reserva cuando la paleta automática se agota', () => {
    // Se generan suficientes procesos (sin color) para consumir toda la paleta.
    const existentes: Proceso[] = [];
    for (let i = 0; i < 12; i++) {
      existentes.push(
        crearProceso({ id: `P${i}`, tiempoLlegada: 0, tiempoCPU: 1 }, existentes),
      );
    }
    // El siguiente proceso ya no encuentra color libre y usa el de reserva.
    const extra = crearProceso({ id: 'PX', tiempoLlegada: 0, tiempoCPU: 1 }, existentes);
    expect(extra.color).toMatch(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  });
});

// ---------------------------------------------------------------------------
// Pruebas para ProcesoControlFinal (inicializarControlProceso)
// ---------------------------------------------------------------------------
describe('inicializarControlProceso (ProcesoControlFinal)', () => {
  const base: Proceso = {
    id: 'P1',
    tiempoLlegada: 0,
    tiempoCPU: 6,
    color: '#ef4444',
  };

  it('1. inicializa tiempoRestante igual a tiempoCPU', () => {
    const c = inicializarControlProceso(base);
    expect(c.tiempoRestante).toBe(base.tiempoCPU);
  });

  it('2. inicializa tiempoFin, tiempoRetorno y tiempoEspera como undefined', () => {
    const c = inicializarControlProceso(base);
    expect(c.tiempoFin).toBeUndefined();
    expect(c.tiempoRetorno).toBeUndefined();
    expect(c.tiempoEspera).toBeUndefined();
  });

  it('3. hereda correctamente el id y color del proceso original', () => {
    const c = inicializarControlProceso(base);
    expect(c.id).toBe(base.id);
    expect(c.color).toBe(base.color);
  });

  it('4. al simular un tick (restar 1 a tiempoRestante) refleja el cambio sin alterar tiempoCPU', () => {
    const c: ProcesoControlFinal = inicializarControlProceso(base);
    c.tiempoRestante -= 1;
    expect(c.tiempoRestante).toBe(5);
    expect(c.tiempoCPU).toBe(6); // tiempoCPU original intacto
    expect(base.tiempoCPU).toBe(6); // el objeto de origen no se muta
  });

  it('5. lanza error si el proceso de origen tiene id o tiempos incoherentes', () => {
    // id inválido (vacío)
    expect(() =>
      inicializarControlProceso({ id: '', tiempoLlegada: 0, tiempoCPU: 5, color: '#fff' }),
    ).toThrow();
    // tiempoCPU incoherente (< 1)
    expect(() =>
      inicializarControlProceso({ id: 'P1', tiempoLlegada: 0, tiempoCPU: 0, color: '#fff' }),
    ).toThrow();
    // tiempoLlegada negativo
    expect(() =>
      inicializarControlProceso({ id: 'P1', tiempoLlegada: -1, tiempoCPU: 5, color: '#fff' }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Pruebas para EstadoPaso (crearPasoInicial / transiciones)
// ---------------------------------------------------------------------------
describe('crearPasoInicial (EstadoPaso)', () => {
  const procesos: Proceso[] = [
    { id: 'P1', tiempoLlegada: 0, tiempoCPU: 4, color: '#ef4444' },
    { id: 'P2', tiempoLlegada: 2, tiempoCPU: 3, color: '#3b82f6' },
    { id: 'P3', tiempoLlegada: 0, tiempoCPU: 5, color: '#10b981' },
  ];

  it('1. el paso inicial en tiempoActual = 0 tiene procesoEnEjecucion = null', () => {
    const paso = crearPasoInicial(procesos);
    expect(paso.tiempoActual).toBe(0);
    expect(paso.procesoEnEjecucion).toBeNull();
  });

  it('2. todos los procesos con tiempoLlegada > 0 tienen estado NotArrived', () => {
    const paso = crearPasoInicial(procesos);
    const p2 = paso.estadosProcesos.find((e) => e.id === 'P2');
    expect(p2?.estado).toBe(NombreEstadoProceso.NotArrived);
  });

  it('3. el array de gantt se inicializa vacío', () => {
    const paso = crearPasoInicial(procesos);
    expect(Array.isArray(paso.gantt)).toBe(true);
    expect(paso.gantt).toHaveLength(0);
  });

  it('4. colaListos incluye solo los IDs con tiempoLlegada === 0 y su estado es Esperando', () => {
    const paso = crearPasoInicial(procesos);
    expect(paso.colaListos).toEqual(['P1', 'P3']);
    expect(paso.colaListos).not.toContain('P2');

    const p1 = paso.estadosProcesos.find((e) => e.id === 'P1');
    const p3 = paso.estadosProcesos.find((e) => e.id === 'P3');
    expect(p1?.estado).toBe(NombreEstadoProceso.Esperando);
    expect(p3?.estado).toBe(NombreEstadoProceso.Esperando);
  });
});