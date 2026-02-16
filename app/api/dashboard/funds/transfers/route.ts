import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fundId = searchParams.get('fund_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let transferQuery;

    if (fundId) {
      // Get transfers for specific fund (both incoming and outgoing)
      transferQuery = sql`
        WITH fund_transfers AS (
          -- Incoming transfers (expenses with destination_fund_id = fundId)
          SELECT 
            e.id,
            e.date,
            e.description,
            e.amount,
            'incoming' as transfer_type,
            c.name as category_name,
            sf.name as source_fund_name,
            sf.id as source_fund_id,
            df.name as destination_fund_name,
            df.id as destination_fund_id,
            e.created_at
          FROM expenses e
          JOIN categories c ON e.category_id = c.id
          LEFT JOIN funds sf ON e.source_fund_id = sf.id
          JOIN funds df ON e.destination_fund_id = df.id
          WHERE e.destination_fund_id = ${fundId}
          
          UNION ALL
          
          -- Outgoing transfers (expenses with source_fund_id = fundId and destination_fund_id)
          SELECT 
            e.id,
            e.date,
            e.description,
            e.amount,
            'outgoing' as transfer_type,
            c.name as category_name,
            sf.name as source_fund_name,
            sf.id as source_fund_id,
            df.name as destination_fund_name,
            df.id as destination_fund_id,
            e.created_at
          FROM expenses e
          JOIN categories c ON e.category_id = c.id
          JOIN funds sf ON e.source_fund_id = sf.id
          LEFT JOIN funds df ON e.destination_fund_id = df.id
          WHERE e.source_fund_id = ${fundId} AND e.destination_fund_id IS NOT NULL
        )
        SELECT *
        FROM fund_transfers
        ORDER BY date DESC, created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
    } else {
      // Get all transfers across all funds
      transferQuery = sql`
        SELECT 
          e.id,
          e.date,
          e.description,
          e.amount,
          'transfer' as transfer_type,
          c.name as category_name,
          sf.name as source_fund_name,
          sf.id as source_fund_id,
          df.name as destination_fund_name,
          df.id as destination_fund_id,
          e.created_at
        FROM expenses e
        JOIN categories c ON e.category_id = c.id
        LEFT JOIN funds sf ON e.source_fund_id = sf.id
        JOIN funds df ON e.destination_fund_id = df.id
        WHERE e.destination_fund_id IS NOT NULL
        ORDER BY e.date DESC, e.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
    }

    interface TransferRow {
      id: number;
      date: string;
      description: string;
      amount: string | number;
      transfer_type: string;
      category_name: string;
      source_fund_name: string | null;
      source_fund_id: number | null;
      destination_fund_name: string | null;
      destination_fund_id: number | null;
      created_at: string;
    }

    const transfers = (await transferQuery) as unknown as TransferRow[];

    // Get transfer statistics
    let statsQuery;
    if (fundId) {
      statsQuery = sql`
        WITH fund_transfer_stats AS (
          -- Incoming transfers
          SELECT 
            COUNT(*) as incoming_count,
            COALESCE(SUM(e.amount), 0) as incoming_total
          FROM expenses e
          WHERE e.destination_fund_id = ${fundId}
        ),
        outgoing_stats AS (
          -- Outgoing transfers
          SELECT 
            COUNT(*) as outgoing_count,
            COALESCE(SUM(e.amount), 0) as outgoing_total
          FROM expenses e
          WHERE e.source_fund_id = ${fundId} AND e.destination_fund_id IS NOT NULL
        )
        SELECT 
          fts.incoming_count,
          fts.incoming_total,
          os.outgoing_count,
          os.outgoing_total,
          (fts.incoming_count + os.outgoing_count) as total_transfers,
          (fts.incoming_total - os.outgoing_total) as net_transfer_amount
        FROM fund_transfer_stats fts
        CROSS JOIN outgoing_stats os
      `;
    } else {
      statsQuery = sql`
        SELECT 
          COUNT(*) as total_transfers,
          COALESCE(SUM(amount), 0) as total_transfer_amount,
          COUNT(DISTINCT DATE(date)) as transfer_days,
          AVG(amount) as average_transfer_amount
        FROM expenses
        WHERE destination_fund_id IS NOT NULL
      `;
    }

    const [stats] = await statsQuery;

    return NextResponse.json({
      fund_id: fundId,
      transfers: transfers.map((transfer: TransferRow) => ({
        ...transfer,
        amount: parseFloat(transfer.amount?.toString() || '0'),
      })),
      pagination: {
        limit,
        offset,
        total: transfers.length,
      },
      statistics: {
        ...stats,
        incoming_total: parseFloat(stats?.incoming_total || 0),
        outgoing_total: parseFloat(stats?.outgoing_total || 0),
        net_transfer_amount: parseFloat(stats?.net_transfer_amount || 0),
        total_transfer_amount: parseFloat(stats?.total_transfer_amount || 0),
        average_transfer_amount: parseFloat(
          stats?.average_transfer_amount || 0
        ),
      },
    });
  } catch (error) {
    console.error('Error fetching fund transfers:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
