import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { AppSettings, CreateSettingsRequest, UpdateSettingsRequest } from "@/types/settings";

export async function GET() {
  try {
    const result = await sql`
      SELECT id, default_fund_id, created_at, updated_at
      FROM settings
      ORDER BY created_at DESC
      LIMIT 1
    `;

    let settings: AppSettings | null = null;

    if (result.length > 0) {
      settings = result[0];
    } else {
      // Create default settings if none exist
      const createResult = await sql`
        INSERT INTO settings (default_fund_id)
        VALUES (NULL)
        RETURNING id, default_fund_id, created_at, updated_at
      `;
      settings = createResult[0];
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSettingsRequest = await request.json();
    const { default_fund_id } = body;

    // Validate that the fund exists if provided
    if (default_fund_id) {
      const fundCheck = await sql`
        SELECT id FROM funds WHERE id = ${default_fund_id}
      `;

      if (fundCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: "El fondo especificado no existe" },
          { status: 400 }
        );
      }
    }

    // Check if settings already exist
    const existingSettings = await sql`SELECT id FROM settings LIMIT 1`;

    let result;
    if (existingSettings.length > 0) {
      // Update existing settings
      result = await sql`
        UPDATE settings
        SET default_fund_id = ${default_fund_id}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${existingSettings[0].id}
        RETURNING id, default_fund_id, created_at, updated_at
      `;
    } else {
      // Create new settings
      result = await sql`
        INSERT INTO settings (default_fund_id)
        VALUES (${default_fund_id})
        RETURNING id, default_fund_id, created_at, updated_at
      `;
    }

    const settings = result[0];

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Error creating/updating settings:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: UpdateSettingsRequest = await request.json();
    const { default_fund_id } = body;

    // Validate that the fund exists if provided
    if (default_fund_id) {
      const fundCheck = await sql`
        SELECT id FROM funds WHERE id = ${default_fund_id}
      `;

      if (fundCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: "El fondo especificado no existe" },
          { status: 400 }
        );
      }
    }

    // Get the first (should be only) settings record
    const settingsResult = await sql`SELECT id FROM settings LIMIT 1`;

    if (settingsResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "No se encontraron configuraciones para actualizar" },
        { status: 404 }
      );
    }

    const result = await sql`
      UPDATE settings
      SET default_fund_id = ${default_fund_id}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${settingsResult[0].id}
      RETURNING id, default_fund_id, created_at, updated_at
    `;

    const settings = result[0];

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}