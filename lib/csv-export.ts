/**
 * Utility functions for CSV and Excel export
 */
import * as XLSX from 'xlsx';

/**
 * Convert an array of objects to CSV string
 * @param data Array of objects to convert
 * @param columns Array of columns to include in the CSV
 * @returns CSV string
 */
export function objectsToCSV(
  data: any[],
  columns: {
    header: string;
    key: string;
    formatter?: (value: any, item?: any) => string;
  }[]
): string {
  // Create headers row
  const headers = columns.map((col) => `"${col.header}"`).join(',');

  // Create data rows
  const rows = data.map((item) => {
    return columns
      .map((column) => {
        const value = item[column.key];
        const formattedValue = column.formatter
          ? column.formatter(value, item)
          : value;

        // Escape quotes and wrap with quotes
        return `"${String(formattedValue).replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  // Combine headers and rows
  return [headers, ...rows].join('\n');
}

/**
 * Download CSV data as a file
 * @param csvString CSV data string
 * @param filename Name for the downloaded file
 */
export function downloadCSV(csvString: string, filename: string): void {
  // Create a blob with the CSV data
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

  // Create a URL for the blob
  const url = URL.createObjectURL(blob);

  // Create a link element
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  // Add the link to the DOM
  document.body.appendChild(link);

  // Click the link to start the download
  link.click();

  // Clean up
  document.body.removeChild(link);
}

/**
 * Column configuration for Excel export
 */
export interface ExcelColumn {
  header: string;
  key: string;
  columnType?: 'currency' | 'number' | 'text';
  formatter?: (value: any, item?: any) => string; // Only used for 'text' type
}

/**
 * Convert an array of objects to Excel workbook
 * @param data Array of objects to convert
 * @param columns Array of columns to include in the Excel
 * @param sheetName Name for the Excel sheet
 * @returns XLSX Workbook
 */
export function objectsToExcel(
  data: any[],
  columns: ExcelColumn[],
  sheetName: string = 'Data'
): XLSX.WorkBook {
  // Transform data to match column structure
  const transformedData = data.map((item) => {
    const transformed: any = {};
    columns.forEach((column) => {
      const value = item[column.key];
      // Only apply formatter for text columns, keep numeric values as numbers
      if (column.columnType === 'text' && column.formatter) {
        transformed[column.header] = column.formatter(value, item);
      } else {
        // For currency and number types, keep the raw numeric value
        transformed[column.header] = value;
      }
    });
    return transformed;
  });

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(transformedData);

  // Apply formatting to specific column types
  const range = XLSX.utils.decode_range(worksheet['!ref']!);
  columns.forEach((column, colIndex) => {
    if (column.columnType === 'currency') {
      // Apply currency formatting to all cells in this column (excluding header)
      for (let row = range.s.r + 1; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex });
        if (worksheet[cellAddress]) {
          // Apply Colombian peso currency format with 2 decimals
          worksheet[cellAddress].z = '"$"#,##0.00';
        }
      }
    } else if (column.columnType === 'number') {
      // Apply number formatting to all cells in this column (excluding header)
      for (let row = range.s.r + 1; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].z = '#,##0.00';
        }
      }
    }
  });

  // Auto-size columns based on content
  const columnWidths = columns.map((col, index) => {
    if (col.columnType === 'currency') {
      // Currency columns need more space for $ symbol and formatting
      return { wch: Math.max(col.header.length + 4, 15) };
    } else {
      const maxLength = Math.max(
        col.header.length,
        ...transformedData.map((row) => String(row[col.header] || '').length)
      );
      return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
    }
  });
  worksheet['!cols'] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return workbook;
}

/**
 * Download Excel data as a file
 * @param workbook XLSX Workbook to download
 * @param filename Name for the downloaded file
 */
export function downloadExcel(workbook: XLSX.WorkBook, filename: string): void {
  // Write the workbook to binary string
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  // Create a blob with the Excel data
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  // Create a URL for the blob
  const url = URL.createObjectURL(blob);

  // Create a link element
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  // Add the link to the DOM
  document.body.appendChild(link);

  // Click the link to start the download
  link.click();

  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Create multi-sheet Excel workbook from grouped data
 * @param dataBySheet Object with sheet names as keys and data arrays as values
 * @param columns Array of columns to include in each sheet
 * @returns XLSX Workbook with multiple sheets
 */
export function createMultiSheetExcel(
  dataBySheet: { [sheetName: string]: any[] },
  columns: ExcelColumn[]
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  // Create a sheet for each period/group
  Object.entries(dataBySheet).forEach(([sheetName, data]) => {
    if (data.length === 0) return; // Skip empty sheets

    // Transform data to match column structure
    const transformedData = data.map((item) => {
      const transformed: any = {};
      columns.forEach((column) => {
        const value = item[column.key];
        // Only apply formatter for text columns, keep numeric values as numbers
        if (column.columnType === 'text' && column.formatter) {
          transformed[column.header] = column.formatter(value, item);
        } else {
          // For currency and number types, keep the raw numeric value
          transformed[column.header] = value;
        }
      });
      return transformed;
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(transformedData);

    // Apply formatting to specific column types
    const range = XLSX.utils.decode_range(worksheet['!ref']!);
    columns.forEach((column, colIndex) => {
      if (column.columnType === 'currency') {
        // Apply currency formatting to all cells in this column (excluding header)
        for (let row = range.s.r + 1; row <= range.e.r; row++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex });
          if (worksheet[cellAddress]) {
            // Apply Colombian peso currency format with 2 decimals
            worksheet[cellAddress].z = '"$"#,##0.00';
          }
        }
      } else if (column.columnType === 'number') {
        // Apply number formatting to all cells in this column (excluding header)
        for (let row = range.s.r + 1; row <= range.e.r; row++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex });
          if (worksheet[cellAddress]) {
            worksheet[cellAddress].z = '#,##0.00';
          }
        }
      }
    });

    // Auto-size columns based on content
    const columnWidths = columns.map((col, index) => {
      if (col.columnType === 'currency') {
        // Currency columns need more space for $ symbol and formatting
        return { wch: Math.max(col.header.length + 4, 15) };
      } else {
        const maxLength = Math.max(
          col.header.length,
          ...transformedData.map((row) => String(row[col.header] || '').length)
        );
        return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
      }
    });
    worksheet['!cols'] = columnWidths;

    // Clean sheet name (Excel sheet names have restrictions)
    const cleanSheetName = sheetName
      .replace(/[\\\/\?\*\[\]]/g, '-') // Replace invalid characters
      .substring(0, 31); // Max 31 characters

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, cleanSheetName);
  });

  return workbook;
}
