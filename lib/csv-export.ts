/**
 * Utility functions for CSV export
 */

/**
 * Convert an array of objects to CSV string
 * @param data Array of objects to convert
 * @param columns Array of columns to include in the CSV
 * @returns CSV string
 */
export function objectsToCSV(
  data: any[],
  columns: { header: string; key: string; formatter?: (value: any) => string }[]
): string {
  // Create headers row
  const headers = columns.map(col => `"${col.header}"`).join(',');
  
  // Create data rows
  const rows = data.map(item => {
    return columns.map(column => {
      const value = item[column.key];
      const formattedValue = column.formatter ? column.formatter(value) : value;
      
      // Escape quotes and wrap with quotes
      return `"${String(formattedValue).replace(/"/g, '""')}"`;
    }).join(',');
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
