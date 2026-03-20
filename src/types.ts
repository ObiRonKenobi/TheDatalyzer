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
}

export type DataCategory = 'public' | 'sports';

export interface Indicator {
  id: string;
  name: string;
  source: string;
  category: DataCategory;
}

export interface Entity {
  code: string;
  name: string;
  category: DataCategory;
  subCategory?: string; // e.g., 'NFL', 'NBA'
}
