import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const sortPlatforms = (platforms: string[]) => {
  return [...platforms].sort((a, b) => a.localeCompare(b));
};

export const DEFAULT_PLATFORM_MAP: Record<string, string> = {
  "PC (Microsoft Windows)": "PC",
  "DOS": "PC"
};

export function getPlatformMap(uiSettings: any): Record<string, string> {
  if (!uiSettings || !uiSettings['ui_platform_map']) {
    return DEFAULT_PLATFORM_MAP;
  }
  try {
    return JSON.parse(uiSettings['ui_platform_map']);
  } catch (e) {
    return DEFAULT_PLATFORM_MAP;
  }
}

export function getDisplayPlatform(platform: string, platformMap: Record<string, string>): string {
  if (platform && platformMap && platform in platformMap) {
    return platformMap[platform];
  }
  return platform || 'Unknown';
}

export function sortOriginalPlatformsByMap(platforms: string[], platformMap: Record<string, string>): string[] {
  const mapKeys = Object.keys(platformMap || {});
  return [...platforms].sort((a, b) => {
    const idxA = mapKeys.indexOf(a);
    const idxB = mapKeys.indexOf(b);
    
    if (idxA !== -1 && idxB !== -1) {
      return idxA - idxB;
    }
    if (idxA !== -1) {
      return -1;
    }
    if (idxB !== -1) {
      return 1;
    }
    return a.localeCompare(b);
  });
}

export function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return new Date(year, month, day);
}

export function formatLocalDate(date: Date | null): string {
  if (!date) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

