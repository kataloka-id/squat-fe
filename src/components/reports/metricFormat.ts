import { formatPercentage } from '@/src/utils/percentage.ts';

export const metricValue = (value: number | null | undefined) => value == null ? '—' : Number(value.toFixed(2));
export const percentageValue = (value: number | null | undefined) => formatPercentage(value);
