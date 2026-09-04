/**
 * Tests for debt-tracking-calculations period catch-up helpers
 * (monthsBetweenPeriods, computeCatchUpCount, applyCatchUp) and the
 * next-payment cuota used by the credit card projection.
 */

import {
  applyCatchUp,
  computeCatchUpCount,
  getNextPaymentCuota,
  monthsBetweenPeriods,
} from '../debt-tracking-calculations';
import type { DebtObligation } from '../../types/debt-tracking';

const makeDebt = (overrides: Partial<DebtObligation> = {}): DebtObligation => ({
  id: 'debt-1',
  name: 'Compra celular',
  credit_card_id: null,
  category_id: null,
  monto_original: 1200,
  plazo_original: 12,
  fecha_inicio: null,
  cuotas_pendientes: 12,
  tasa_interes: 0,
  tipo_tasa: 'EM',
  saldo_actual: 1200,
  pago_mensual: 100,
  valor_seguro: 0,
  dia_pago: null,
  last_updated_period_id: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('debt-tracking-calculations period sync', () => {
  describe('monthsBetweenPeriods', () => {
    it('should return 0 for the same month', () => {
      expect(
        monthsBetweenPeriods({ year: 2026, month: 5 }, { year: 2026, month: 5 })
      ).toBe(0);
    });

    it('should count months within a year', () => {
      expect(
        monthsBetweenPeriods({ year: 2026, month: 5 }, { year: 2026, month: 8 })
      ).toBe(3);
    });

    it('should count across year boundaries', () => {
      // November 2025 -> February 2026
      expect(
        monthsBetweenPeriods(
          { year: 2025, month: 10 },
          { year: 2026, month: 1 }
        )
      ).toBe(3);
    });

    it('should be negative when the target is before the origin', () => {
      expect(
        monthsBetweenPeriods({ year: 2026, month: 8 }, { year: 2026, month: 5 })
      ).toBe(-3);
    });
  });

  describe('computeCatchUpCount', () => {
    it('should count elapsed months since the last synced period', () => {
      const debt = makeDebt({ cuotas_pendientes: 12 });
      expect(
        computeCatchUpCount(
          debt,
          { year: 2026, month: 5 },
          { year: 2026, month: 8 }
        )
      ).toBe(3);
    });

    it('should never exceed the pending cuotas', () => {
      const debt = makeDebt({ cuotas_pendientes: 1 });
      expect(
        computeCatchUpCount(
          debt,
          { year: 2026, month: 5 },
          { year: 2026, month: 8 }
        )
      ).toBe(1);
    });

    it('should be forward-only when the last period is ahead', () => {
      const debt = makeDebt({ cuotas_pendientes: 12 });
      expect(
        computeCatchUpCount(
          debt,
          { year: 2026, month: 8 },
          { year: 2026, month: 5 }
        )
      ).toBe(0);
    });

    it('should fall back to fecha_inicio when never synced', () => {
      // Started June 2026 (3 months before the September 2026 period),
      // 12-cuota plazo, no payment applied yet -> 3 cuotas behind.
      const debt = makeDebt({
        fecha_inicio: '2026-06-10',
        cuotas_pendientes: 12,
      });
      expect(computeCatchUpCount(debt, null, { year: 2026, month: 8 })).toBe(3);
    });

    it('should anchor expected remaining on plazo_original minus elapsed', () => {
      // Started January 2025, plazo 6: by September 2026 it should be done.
      const debt = makeDebt({
        fecha_inicio: '2025-01-05',
        plazo_original: 6,
        cuotas_pendientes: 6,
      });
      expect(computeCatchUpCount(debt, null, { year: 2026, month: 8 })).toBe(6);
    });

    it('should account for manually applied payments against fecha_inicio', () => {
      // Started June 2026 (3 months elapsed), user already applied 2 payments.
      const debt = makeDebt({
        fecha_inicio: '2026-06-10',
        cuotas_pendientes: 10,
      });
      expect(computeCatchUpCount(debt, null, { year: 2026, month: 8 })).toBe(1);
    });

    it('should return 0 without any date anchor', () => {
      const debt = makeDebt({ fecha_inicio: null });
      expect(computeCatchUpCount(debt, null, { year: 2026, month: 8 })).toBe(0);
    });

    it('should return 0 when the debt is fully paid', () => {
      const debt = makeDebt({ cuotas_pendientes: 0 });
      expect(
        computeCatchUpCount(
          debt,
          { year: 2026, month: 5 },
          { year: 2026, month: 8 }
        )
      ).toBe(0);
    });

    it('should return 0 for an unparseable fecha_inicio', () => {
      const debt = makeDebt({
        fecha_inicio: '15/06/2026',
        cuotas_pendientes: 12,
      });
      expect(computeCatchUpCount(debt, null, { year: 2026, month: 8 })).toBe(0);
    });
  });

  describe('applyCatchUp', () => {
    it('should apply several amortization payments in sequence', () => {
      const result = applyCatchUp(makeDebt(), 3);
      expect(result).toEqual({ saldo_actual: 900, cuotas_pendientes: 9 });
    });

    it('should stop once the debt is paid off', () => {
      const result = applyCatchUp(makeDebt({ pago_mensual: 100 }), 20);
      expect(result).toEqual({ saldo_actual: 0, cuotas_pendientes: 0 });
    });

    it('should change nothing for 0 payments', () => {
      const result = applyCatchUp(makeDebt(), 0);
      expect(result).toEqual({ saldo_actual: 1200, cuotas_pendientes: 12 });
    });
  });

  describe('getNextPaymentCuota', () => {
    it('should return 0 when only the active-period cuota remains', () => {
      expect(getNextPaymentCuota(makeDebt({ cuotas_pendientes: 1 }))).toBe(0);
    });

    it('should return the agreed pago_mensual when set', () => {
      expect(
        getNextPaymentCuota(
          makeDebt({ cuotas_pendientes: 5, pago_mensual: 250 })
        )
      ).toBe(250);
    });

    it('should fall back to the theoretical breakdown when pago_mensual is 0', () => {
      expect(
        getNextPaymentCuota(
          makeDebt({
            saldo_actual: 1000,
            cuotas_pendientes: 5,
            pago_mensual: 0,
            tasa_interes: 0,
          })
        )
      ).toBe(200);
    });
  });
});
