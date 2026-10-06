/** Shared types for the US site-size overview (safe for client components). */

export type SizeShare = {
  stalls: number;
  sites: number;
  pct: number;
};

/** One row in the 3/4 isometric site-size chart. */
export type SizeIsoLayer = {
  stalls: number;
  sites: number;
  pct: number;
  /** Share of all open stalls in this size band. */
  stallPct: number;
  sitesLabel: string;
  buildersLabel: string;
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
  headline: string;
  subline: string;
  tiles: SizeStatTile[];
};

export type SizeOverview = {
  totalSites: number;
  totalStalls: number;
  median: number;
  average: number;
  sizeShares: SizeShare[];
  isoLayers: SizeIsoLayer[];
  sizeColumns: number[];
  rows: SizeRow[];
  takeaways: string[];
  story: SizeStory;
  generated: string;
  pulledAt: string | null;
};
