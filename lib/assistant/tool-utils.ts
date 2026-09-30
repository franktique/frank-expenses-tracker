import { sql } from '@/lib/db';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

export function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export async function getActivePeriod(): Promise<{
  id: string;
  name: string;
  month: number;
  year: number;
} | null> {
  const rows = await sql`
    SELECT id, name, month, year FROM periods WHERE is_open = true LIMIT 1
  `;
  return (rows[0] as any) || null;
}

export const TIPO_GASTO_LABELS: Record<string, string> = {
  F: 'Fijo',
  V: 'Variable',
  SF: 'Semi Fijo',
  E: 'Eventual',
};
