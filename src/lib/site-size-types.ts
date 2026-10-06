/** Shared types for the US site-size overview (safe for client components). */

export type SizeShare = {
  stalls: number;
  sites: number;
  pct: number;
};

export type SizeCell = {
  stalls: number;
  count: number;
  siteNames: string[];
};

export type SizeRow = {
  key: string;
  label: string;
  isFrancis: boolean;
  isRollup: boolean;
  totalSites: number;
  totalStalls: number;
  cells: SizeCell[];
  /** For the single-site rollup: operator names (sorted). */
  operators?: string[];
};

export type SizeStatTile = {
  value: string;
  label: string;
};

export type SizeStory = {
  /** Big Fraunces answer, e.g. "Most are small: 40 of 64 sites have just 4 stalls." */
  headline: string;
  /** Who goes bigger, plain English. */
  subline: string;
  tiles: SizeStatTile[];
};

export type SizeOverview = {
  totalSites: number;
  totalStalls: number;
  median: number;
  average: number;
  sizeShares: SizeShare[];
  sizeColumns: number[];
  rows: SizeRow[];
  takeaways: string[];
  story: SizeStory;
  generated: string;
  pulledAt: string | null;
};
