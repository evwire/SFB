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

export type SizeOverview = {
  totalSites: number;
  totalStalls: number;
  median: number;
  average: number;
  sizeShares: SizeShare[];
  sizeColumns: number[];
  rows: SizeRow[];
  takeaways: string[];
  generated: string;
  pulledAt: string | null;
};
