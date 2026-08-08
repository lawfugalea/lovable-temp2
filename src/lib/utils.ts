import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Clankeep ships to Malta: dates read "27 July 2026", not "July 27, 2026", and
 * money follows local grouping. The finance and meals modules already pass
 * 'en-MT' explicitly at each call site; this is the shared default so that a
 * new formatter cannot quietly reintroduce US conventions.
 */
export const APP_LOCALE = "en-MT"

export function formatCurrency(
  amount: number,
  currency: string = "EUR",
  locale: string = APP_LOCALE
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount)
}

export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  }).format(new Date(date))
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const target = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - target.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return "just now"
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours === 1 ? "" : "s"} ago`
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days === 1 ? "" : "s"} ago`
  } else {
    return formatDate(target, { month: "short", day: "numeric" })
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}
