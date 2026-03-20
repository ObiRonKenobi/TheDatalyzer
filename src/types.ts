export interface DataPoint {
  year: number;
  [key: string]: number | string | undefined;
}

export interface SeriesConfig {
  key: string;
  name: string;
  color: string;
  yAxisId?: string;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'area';
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  yAxisLabelRight?: string;
  series: SeriesConfig[];
  politicalPeriods?: PoliticalPeriod[];
}

export type DataCategory = 'public' | 'sports' | 'nasa' | 'usgov' | 'owid' | 'tableau' | 'politics';

export interface PoliticalPeriod {
  startYear: number;
  endYear: number;
  party: 'Democrat' | 'Republican' | 'Other';
  president: string;
  senateControl: 'Democrat' | 'Republican' | 'Split';
  houseControl: 'Democrat' | 'Republican' | 'Split';
}

export interface Indicator {
  id: string;
  name: string;
  source: string;
  category: DataCategory;
  unit?: string;
}

export interface Entity {
  code: string;
  name: string;
  category: DataCategory;
  subCategory?: string; // e.g., 'NFL', 'NBA'
}
