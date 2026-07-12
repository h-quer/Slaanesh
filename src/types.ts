export interface SortCriterion {
  field: string;
  dir: 'asc' | 'desc' | 'custom';
}

export interface Game {
  igdb_id: number;
  name: string;
  platforms: string[];
  game_status: string;
  status_color: string;
  categories: string[];
  release_date: string;
  release_status: string | null;
  slug: string;
  summary: string;
  websites: any[];
  shops: { name: string; url: string }[];
  owned_vaults?: string | null;
  last_updated: string;
  comment: string;
  game_rating: number | null;
  genres: string[];
  themes: string[];
  developers: string[];
  publishers: string[];
  playthrough_info?: {
    uuid: number;
    igdb_id: number;
    date: string;
    status_label: string | null;
    status_color: string | null;
    playthrough_status: string | null;
    platform: string;
    rating?: number;
    time_played_minutes?: number;
    comment?: string | null;
    version?: string | null;
  }[];
  _unique_key?: string;
  _playthrough?: any;
}

export type PlatformMap = Record<string, string>;

export interface StatData {
  totals: { games: number; playthroughs: number };
  categories: { category: string; count: number }[];
  completion: { label: string; count: number }[];
  platformStats: { label: string; count: number }[];
  yearlyStats: { year: string; statuses: { label: string; color: string; count: number }[] }[];
  genreStats: { label: string; count: number }[];
  themeStats: { label: string; count: number }[];
  genreStatsPositive?: { label: string; count: number }[];
  themeStatsPositive?: { label: string; count: number }[];
  platformStatsPositive?: { label: string; count: number }[];
}
