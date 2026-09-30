/** @jest-environment node */
import {
  buildSavingsProposal,
  type SimulationBudgetRow,
} from '../simulation-savings';
import { TOOLS } from '../assistant/tools';

const rows: SimulationBudgetRow[] = [
  {
    category_id: 'a',
    category_name: 'Comida',
    efectivo_amount: 500,
    credito_amount: 300,
    ahorro_efectivo_amount: 50,
    ahorro_credito_amount: 0,
  },
  {
    category_id: 'b',
    category_name: 'Ocio',
    efectivo_amount: 200,
    credito_amount: 0,
    ahorro_efectivo_amount: 0,
    ahorro_credito_amount: 0,
  },
];

describe('buildSavingsProposal', () => {
  it('computes before/after and totals', () => {
    const p = buildSavingsProposal(rows, [
      { category_id: 'a', ahorro_credito_amount: 100 },
      { category_id: 'b', ahorro_efectivo_amount: 40 },
    ]);
    expect(p.errors).toEqual([]);
    expect(p.changes).toHaveLength(2);
    // Omitted field keeps its current value.
    expect(p.changes[0].after).toEqual({
      ahorro_efectivo_amount: 50,
      ahorro_credito_amount: 100,
    });
    expect(p.totals_before.total_ahorro).toBe(50);
    expect(p.totals_after).toEqual({
      ahorro_efectivo: 90,
      ahorro_credito: 100,
      total_ahorro: 190,
    });
  });

  it('rejects savings above the matching amount or negative', () => {
    const p = buildSavingsProposal(rows, [
      { category_id: 'a', ahorro_efectivo_amount: 501 },
      { category_id: 'b', ahorro_credito_amount: 1 },
      { category_id: 'a', ahorro_efectivo_amount: -5 },
    ]);
    expect(p.changes).toHaveLength(0);
    expect(p.errors).toHaveLength(3);
  });

  it('reports unknown categories and drops no-op changes', () => {
    const p = buildSavingsProposal(rows, [
      { category_id: 'zzz', ahorro_efectivo_amount: 1 },
      { category_id: 'a', ahorro_efectivo_amount: 50 },
    ]);
    expect(p.changes).toHaveLength(0);
    expect(p.errors).toHaveLength(1);
  });
});

describe('global tool registry (also served over MCP)', () => {
  it('does not include simulation tools', () => {
    const names = TOOLS.map((t) => t.name);
    expect(names).not.toContain('propose_savings_changes');
    expect(names).not.toContain('get_simulation_overview');
  });
});
