import { describe, expect, it } from 'vitest';
import { metricValue, percentageValue } from './metricFormat.ts';

describe('Report breakdown metric presentation', () => {
  it('renders missing backend values as an em dash rather than undefined or undefined%', () => {
    expect(metricValue(undefined)).toBe('—');
    expect(metricValue(null)).toBe('—');
    expect(percentageValue(undefined)).toBe('—');
    expect(percentageValue(null)).toBe('—');
  });

  it('formats defined percentages consistently', () => {
    expect(percentageValue(66.666)).toBe('66.67%');
  });
});
