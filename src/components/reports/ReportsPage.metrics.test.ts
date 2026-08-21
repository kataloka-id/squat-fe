import { describe, expect, it } from 'vitest';
import { metricValue, percentageValue } from './metricFormat.ts';

describe('Report breakdown metric presentation', () => {
  it('renders missing percentage values as N/A rather than invalid percentage text', () => {
    expect(metricValue(undefined)).toBe('—');
    expect(metricValue(null)).toBe('—');
    expect(percentageValue(undefined)).toBe('N/A');
    expect(percentageValue(null)).toBe('N/A');
  });

  it('formats defined percentages consistently', () => {
    expect(percentageValue(66.666)).toBe('66.67%');
    expect(percentageValue(Number.NaN)).toBe('N/A');
  });
});
