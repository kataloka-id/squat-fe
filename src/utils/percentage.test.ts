import { describe, expect, it } from 'vitest';
import { formatPercentage, percentageNumber } from './percentage.ts';

describe('formatPercentage', () => {
  it('renders unavailable data as N/A', () => {
    expect(formatPercentage(null)).toBe('N/A');
    expect(formatPercentage(undefined)).toBe('N/A');
    expect(formatPercentage(Number.NaN)).toBe('N/A');
    expect(formatPercentage(75, { hasDenominator: false })).toBe('N/A');
  });

  it('renders a measured zero as 0%', () => {
    expect(formatPercentage(0, { hasDenominator: true })).toBe('0%');
  });

  it('formats and clamps valid percentages', () => {
    expect(formatPercentage(75, { hasDenominator: true })).toBe('75%');
    expect(formatPercentage(75.126, { hasDenominator: true })).toBe('75.13%');
    expect(percentageNumber(-10)).toBe(0);
    expect(percentageNumber(125)).toBe(100);
  });
});
