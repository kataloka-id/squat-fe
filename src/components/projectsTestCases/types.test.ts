import { describe, expect, it } from 'vitest';
import {
  AutomationReadiness,
  matchesAutomationReadinessFilter,
  normalizeAutomationReadiness,
} from './types.ts';

describe('automation readiness compatibility', () => {
  it('maps missing and invalid legacy API values to Candidate', () => {
    expect(normalizeAutomationReadiness(undefined)).toBe(AutomationReadiness.Candidate);
    expect(normalizeAutomationReadiness('unsupported')).toBe(AutomationReadiness.Candidate);
  });

  it('matches readiness filters independently using the normalized value', () => {
    expect(matchesAutomationReadinessFilter(undefined, [AutomationReadiness.Candidate])).toBe(true);
    expect(matchesAutomationReadinessFilter(AutomationReadiness.Ready, [AutomationReadiness.Candidate])).toBe(false);
    expect(matchesAutomationReadinessFilter(AutomationReadiness.Ready, [])).toBe(true);
  });
});
