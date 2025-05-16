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

export function formatDate(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  }

  const mergedOptions = { ...defaultOptions, ...options }

  return new Intl.DateTimeFormat("es-ES", mergedOptions).format(date)
}
