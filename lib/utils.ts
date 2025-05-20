import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  // Format with COP currency code
  const formatted = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0, // Colombian Pesos typically don't use decimal places
    maximumFractionDigits: 0,
  }).format(amount)

  // Replace the default "COP" with "COP$" if needed
  return formatted
}

export function formatDate(date: Date | string, options: Intl.DateTimeFormatOptions = {}): string {
  // Asegurarse de que la fecha sea un objeto Date válido
  let dateObj: Date;
  
  if (date instanceof Date) {
    dateObj = new Date(date.getTime()); // Copia para no modificar el original
  } else {
    // Si es un string de fecha ISO (con T y Z o +/-)
    if (typeof date === 'string' && date.includes('T')) {
      // Extraer solo la parte de la fecha (YYYY-MM-DD) ignorando la hora/zona
      const datePart = date.split('T')[0];
      // Crear una fecha usando solo la parte de fecha a medianoche UTC
      dateObj = new Date(datePart + 'T00:00:00Z');
    } else {
      // Cualquier otro formato de fecha
      dateObj = new Date(date);
    }
  }
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota", // Usar específicamente la zona horaria de Colombia
  }

  const mergedOptions = { ...defaultOptions, ...options }

  // Usar es-CO para formato colombiano
  return new Intl.DateTimeFormat("es-CO", mergedOptions).format(dateObj)
}
