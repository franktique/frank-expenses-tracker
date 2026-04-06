import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST() {
  try {
    // Create debt_obligations table
    await sql`
      CREATE TABLE IF NOT EXISTS debt_obligations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        monto_original DECIMAL(15,2) NOT NULL,
        plazo_original INTEGER NOT NULL,
        fecha_inicio DATE,
        cuotas_pendientes INTEGER NOT NULL,
        tasa_interes DECIMAL(8,4) NOT NULL,
        tipo_tasa VARCHAR(2) NOT NULL DEFAULT 'EA'
          CHECK (tipo_tasa IN ('EA', 'EM')),
        saldo_actual DECIMAL(15,2) NOT NULL,
        pago_mensual DECIMAL(15,2) NOT NULL,
        valor_seguro DECIMAL(15,2) NOT NULL DEFAULT 0,
        dia_pago INTEGER CHECK (dia_pago BETWEEN 1 AND 31),
        last_updated_period_id UUID REFERENCES periods(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Add valor_seguro column to existing tables (idempotent)
    await sql`
      ALTER TABLE debt_obligations
      ADD COLUMN IF NOT EXISTS valor_seguro DECIMAL(15,2) NOT NULL DEFAULT 0
    `;

    // Verify table exists
    const result = await sql`
      SELECT COUNT(*) as count FROM debt_obligations
    `;

    return NextResponse.json({
      success: true,
      message: 'Migración completada correctamente',
      tables: ['debt_obligations'],
      count: result[0]?.count ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';

    // If already exists, verify and return success
    if (message.includes('already exists')) {
      return NextResponse.json({
        success: true,
        message: 'Las tablas ya existen',
        tables: ['debt_obligations'],
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
        hint: 'Ejecute POST /api/migrate-debt-tracking para inicializar las tablas',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await sql`
      SELECT COUNT(*) as count FROM debt_obligations
    `;

    return NextResponse.json({
      status: 'fully_migrated',
      tables: ['debt_obligations'],
      count: result[0]?.count ?? 0,
    });
  } catch {
    return NextResponse.json({
      status: 'not_migrated',
      tables: [],
      hint: 'Execute POST /api/migrate-debt-tracking',
    });
  }
}
