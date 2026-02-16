import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST() {
  try {
    console.log('Starting estudio grouper percentages migration...');

    // Add percentage column to estudio_groupers table
    await sql`
      ALTER TABLE estudio_groupers 
      ADD COLUMN IF NOT EXISTS percentage DECIMAL(5,2) DEFAULT NULL
    `;

    // Add constraint to ensure percentage is between 0 and 100
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE table_name = 'estudio_groupers' 
          AND constraint_name = 'check_percentage_range'
        ) THEN
          ALTER TABLE estudio_groupers 
          ADD CONSTRAINT check_percentage_range 
          CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100));
        END IF;
      END $$
    `;

    // Create index for faster filtering by percentage
    await sql`
      CREATE INDEX IF NOT EXISTS idx_estudio_groupers_percentage 
      ON estudio_groupers(percentage) WHERE percentage IS NOT NULL
    `;

    // Add comment to document the purpose
    await sql`
      COMMENT ON COLUMN estudio_groupers.percentage IS 'Optional percentage value (0-100) for calculating reference lines in charts'
    `;

    console.log('Estudio grouper percentages migration completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Estudio grouper percentages migration completed successfully',
      changes: [
        'Added percentage column to estudio_groupers table',
        'Added percentage range constraint (0-100)',
        'Created index for percentage filtering',
        'Added column documentation',
      ],
    });
  } catch (error) {
    console.error('Error in estudio grouper percentages migration:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
