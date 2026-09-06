import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
  accent: string;
}

export const THEME_NAMES = ['light', 'dark', 'sepia'] as const;
export type ThemeName = typeof THEME_NAMES[number];
