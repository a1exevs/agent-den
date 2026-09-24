import { type ClassValue, clsx } from 'clsx';

/** Joins conditional CSS class names. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
