import * as XLSX from 'xlsx';

/**
 * Export data structure for simulation
 */
export interface SimulationExportData {
  simulation: {
    id: number;
    name: string;
    description?: string;
  };
  incomes: Array<{
    description: string;
    amount: number;
  }>;
  totalIncome: number;
  budgets: Array<{
    category_id: string | number;
    category_name: string;
    efectivo_amount: number;
    credito_amount: number;
    ahorro_efectivo_amount: number;
    ahorro_credito_amount: number;
    total: number;
    balance: number;
  }>;
  subgroups?: Array<{
    id: string;
    name: string;
    displayOrder: number;
    categoryIds: (string | number)[];
  }>;
  totals: {
    efectivo: number;
    credito: number;
    ahorro_efectivo: number;
    ahorro_credito: number;
    general: number;
  };
  categoryCount: number;
  totalCategories: number;
}

/**
 * Format currency for Excel display (text only - used for summary labels)
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Apply Excel currency formatting to a cell
 * Uses Excel number format code for Colombian Peso
 */
function applyCurrencyFormat(sheet: XLSX.WorkSheet, cellAddress: string): void {
  if (!sheet[cellAddress]) return;

  // Ensure cell type is numeric
  if (sheet[cellAddress].t !== 'n') return;

  // Apply currency format: $ with thousand separators, no decimals
  if (!sheet[cellAddress].z) {
    sheet[cellAddress].z = '"$"#,##0';
  }
}

/**
 * Generate Excel workbook from simulation export data
 */
export function generateSimulationExcel(
  data: SimulationExportData
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Resumen (Summary)
  const summaryData = [
    ['RESUMEN DE SIMULACIÓN'],
    [],
    ['Concepto', 'Valor'],
    ['Simulación', data.simulation.name],
    [],
    ['INGRESOS'],
  ];

  // Add income details with raw numeric values
  data.incomes.forEach((income) => {
    summaryData.push([income.description, income.amount]);
  });

  summaryData.push(
    [],
    ['Total Ingresos', data.totalIncome],
    [],
    ['PRESUPUESTOS'],
    ['Total Efectivo', data.totals.efectivo],
    ['Total Crédito', data.totals.credito],
    ['Total Ahorro Efectivo', data.totals.ahorro_efectivo],
    ['Total Ahorro Crédito', data.totals.ahorro_credito],
    ['Total General', data.totals.general],
    [],
    ['Categorías Configuradas', data.categoryCount],
    ['Total Categorías', data.totalCategories]
  );

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Set column widths for summary sheet
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];

  // Apply styling and number formatting to summary sheet
  const summaryRange = XLSX.utils.decode_range(summarySheet['!ref'] || 'A1');
  for (let R = summaryRange.s.r; R <= summaryRange.e.r; ++R) {
    for (let C = summaryRange.s.c; C <= summaryRange.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!summarySheet[cellAddress]) continue;

      // Apply currency format to numeric values in column B (index 1)
      if (C === 1 && summarySheet[cellAddress].t === 'n') {
        applyCurrencyFormat(summarySheet, cellAddress);
      }

      // Bold style for specific rows
      if (
        R === 0 ||
        R === 5 ||
        R === 5 + data.incomes.length + 2 ||
        summarySheet[cellAddress].v === 'Concepto' ||
        summarySheet[cellAddress].v === 'Total Ingresos'
      ) {
        if (!summarySheet[cellAddress].s) {
          summarySheet[cellAddress].s = {};
        }
        summarySheet[cellAddress].s = {
          ...summarySheet[cellAddress].s,
          font: { bold: true },
        };
      }
    }
  }

  // Sheet 2: Presupuestos (Budgets)
  const budgetHeaders = [
    'Categoría',
    'Efectivo',
    'Crédito',
    'Ahorro Efectivo',
    'Ahorro Crédito',
    'Total',
    'Balance',
  ];

  const budgetData: any[][] = [budgetHeaders];

  // Helper function to calculate subgroup subtotals
  const calculateSubgroupSubtotals = (
    categoryIds: (string | number)[]
  ): {
    efectivo: number;
    credito: number;
    ahorro_efectivo: number;
    ahorro_credito: number;
    total: number;
  } => {
    let efectivo = 0;
    let credito = 0;
    let ahorroEfectivo = 0;
    let ahorroCredito = 0;

    categoryIds.forEach((categoryId) => {
      const budget = data.budgets.find(
        (b) => String(b.category_id) === String(categoryId)
      );
      if (budget) {
        efectivo += budget.efectivo_amount;
        credito += budget.credito_amount;
        ahorroEfectivo += budget.ahorro_efectivo_amount;
        ahorroCredito += budget.ahorro_credito_amount;
      }
    });

    return {
      efectivo,
      credito,
      ahorro_efectivo: ahorroEfectivo,
      ahorro_credito: ahorroCredito,
      total: efectivo + credito - ahorroEfectivo - ahorroCredito,
    };
  };

  // Get all categorized IDs from subgroups
  const categorizedIds = new Set<string | number>();
  if (data.subgroups && data.subgroups.length > 0) {
    data.subgroups.forEach((subgroup) => {
      subgroup.categoryIds.forEach((id) => categorizedIds.add(id));
    });
  }

  // If we have subgroups, organize budgets by subgroups
  if (data.subgroups && data.subgroups.length > 0) {
    data.subgroups.forEach((subgroup) => {
      // Add subgroup header row (with indent formatting)
      budgetData.push([
        `  [${subgroup.name}]`, // Indent with spaces
        '', // Efectivo
        '', // Crédito
        '', // Ahorro Efectivo
        '', // Ahorro Crédito
        '', // Total
        '', // Balance
      ]);

      // Add categories within the subgroup
      subgroup.categoryIds.forEach((categoryId) => {
        const budget = data.budgets.find(
          (b) => String(b.category_id) === String(categoryId)
        );
        if (budget) {
          budgetData.push([
            `    ${budget.category_name}`, // Extra indent for categories within subgroup
            budget.efectivo_amount,
            budget.credito_amount,
            budget.ahorro_efectivo_amount,
            budget.ahorro_credito_amount,
            budget.total,
            budget.balance,
          ]);
        }
      });

      // Add subgroup subtotal row
      const subtotals = calculateSubgroupSubtotals(subgroup.categoryIds);
      budgetData.push([
        `  Subtotal: ${subgroup.name}`,
        subtotals.efectivo,
        subtotals.credito,
        subtotals.ahorro_efectivo,
        subtotals.ahorro_credito,
        subtotals.total,
        '', // No balance for subtotals
      ]);

      // Add empty row for spacing
      budgetData.push(['', '', '', '', '', '', '']);
    });
  }

  // Add uncategorized categories (those not in any subgroup)
  if (categorizedIds.size < data.budgets.length) {
    budgetData.push(['Categorías Sin Grupo', '', '', '', '', '', '']);
    data.budgets.forEach((budget) => {
      if (!categorizedIds.has(budget.category_id)) {
        budgetData.push([
          budget.category_name,
          budget.efectivo_amount,
          budget.credito_amount,
          budget.ahorro_efectivo_amount,
          budget.ahorro_credito_amount,
          budget.total,
          budget.balance,
        ]);
      }
    });
    budgetData.push(['', '', '', '', '', '', '']);
  } else if (!data.subgroups || data.subgroups.length === 0) {
    // If no subgroups, add all budgets normally
    data.budgets.forEach((budget) => {
      budgetData.push([
        budget.category_name,
        budget.efectivo_amount,
        budget.credito_amount,
        budget.ahorro_efectivo_amount,
        budget.ahorro_credito_amount,
        budget.total,
        budget.balance,
      ]);
    });
  }

  // Add totals row with raw numeric values
  budgetData.push([
    'TOTALES',
    data.totals.efectivo,
    data.totals.credito,
    data.totals.ahorro_efectivo,
    data.totals.ahorro_credito,
    data.totals.general,
    '', // No balance for totals
  ]);

  const budgetSheet = XLSX.utils.aoa_to_sheet(budgetData);

  // Set column widths for budget sheet
  budgetSheet['!cols'] = [
    { wch: 30 }, // Categoría
    { wch: 18 }, // Efectivo
    { wch: 18 }, // Crédito
    { wch: 18 }, // Ahorro Efectivo
    { wch: 18 }, // Ahorro Crédito
    { wch: 18 }, // Total
    { wch: 18 }, // Balance
  ];

  // Apply styling and number formatting to budget sheet
  const budgetRange = XLSX.utils.decode_range(budgetSheet['!ref'] || 'A1');
  for (let R = budgetRange.s.r; R <= budgetRange.e.r; ++R) {
    for (let C = budgetRange.s.c; C <= budgetRange.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!budgetSheet[cellAddress]) continue;

      const cellValue = budgetSheet[cellAddress].v;
      const isSubgroupHeader =
        typeof cellValue === 'string' && cellValue.startsWith('  [');
      const isSubgroupSubtotal =
        typeof cellValue === 'string' && cellValue.includes('Subtotal:');
      const isSectionHeader =
        typeof cellValue === 'string' && cellValue === 'Categorías Sin Grupo';
      const isEmpty = cellValue === '' || cellValue === undefined;

      // Apply currency format to numeric columns (B=Efectivo, C=Crédito, D=Ahorro Efectivo, E=Ahorro Crédito, F=Total, G=Balance)
      // Skip header row (R === 0), section headers, subgroup rows, and empty rows
      if (
        R > 0 &&
        C >= 1 &&
        C <= 6 &&
        !isEmpty &&
        !isSubgroupHeader &&
        !isSectionHeader &&
        !isSubgroupSubtotal
      ) {
        applyCurrencyFormat(budgetSheet, cellAddress);
      }

      // Bold style for main header row
      if (R === 0) {
        if (!budgetSheet[cellAddress].s) {
          budgetSheet[cellAddress].s = {};
        }
        budgetSheet[cellAddress].s = {
          ...budgetSheet[cellAddress].s,
          font: { bold: true },
          fill: { fgColor: { rgb: 'E8F4F8' } },
        };
      }

      // Bold style for totals row (last row)
      if (R === budgetData.length - 1) {
        if (!budgetSheet[cellAddress].s) {
          budgetSheet[cellAddress].s = {};
        }
        budgetSheet[cellAddress].s = {
          ...budgetSheet[cellAddress].s,
          font: { bold: true },
          fill: { fgColor: { rgb: 'D4E4F8' } },
        };
      }

      // Styling for subgroup headers (light blue background)
      if (isSubgroupHeader) {
        if (!budgetSheet[cellAddress].s) {
          budgetSheet[cellAddress].s = {};
        }
        budgetSheet[cellAddress].s = {
          ...budgetSheet[cellAddress].s,
          font: { bold: true, color: { rgb: '1F4E78' } },
          fill: { fgColor: { rgb: 'E7F0F7' } },
        };
      }

      // Styling for subgroup subtotals (italics and light gray)
      if (isSubgroupSubtotal) {
        if (!budgetSheet[cellAddress].s) {
          budgetSheet[cellAddress].s = {};
        }
        budgetSheet[cellAddress].s = {
          ...budgetSheet[cellAddress].s,
          font: { italic: true, color: { rgb: '595959' } },
          fill: { fgColor: { rgb: 'F2F2F2' } },
        };
        // Apply currency format to subtotal numeric cells
        if (C >= 1 && C <= 5) {
          applyCurrencyFormat(budgetSheet, cellAddress);
        }
      }

      // Styling for section headers
      if (isSectionHeader) {
        if (!budgetSheet[cellAddress].s) {
          budgetSheet[cellAddress].s = {};
        }
        budgetSheet[cellAddress].s = {
          ...budgetSheet[cellAddress].s,
          font: { bold: true, color: { rgb: '4472C4' } },
          fill: { fgColor: { rgb: 'E7E6E6' } },
        };
      }
    }
  }

  // Add sheets to workbook
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
  XLSX.utils.book_append_sheet(workbook, budgetSheet, 'Presupuestos');

  return workbook;
}

/**
 * Download Excel file
 */
export function downloadExcelFile(
  workbook: XLSX.WorkBook,
  filename: string
): void {
  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  // Create blob
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Generate filename for simulation export
 */
export function generateSimulationFilename(simulationName: string): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .substring(0, 19);
  const sanitizedName = simulationName
    .replace(/[^a-z0-9]/gi, '-')
    .toLowerCase();
  return `simulacion-${sanitizedName}-${timestamp}.xlsx`;
}

/**
 * Main export function - combines all steps
 */
export async function exportSimulationToExcel(
  simulationId: number
): Promise<void> {
  try {
    // Fetch data from API
    const response = await fetch(`/api/simulations/${simulationId}/export`);

    if (!response.ok) {
      throw new Error(
        `Error al obtener datos de exportación: ${response.statusText}`
      );
    }

    const data: SimulationExportData = await response.json();

    // Generate Excel workbook
    const workbook = generateSimulationExcel(data);

    // Generate filename
    const filename = generateSimulationFilename(data.simulation.name);

    // Download file
    downloadExcelFile(workbook, filename);
  } catch (error) {
    console.error('Error exporting simulation to Excel:', error);
    throw error;
  }
}
