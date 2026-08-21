import { describe, expect, it } from 'vitest';
import {
  AutomationReadiness,
  matchesAutomationReadinessFilter,
  normalizePriority,
  Priority,
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

describe('priority compatibility', () => {
  it('uses Not Defined as the canonical legacy fallback', () => {
    expect(normalizePriority(undefined)).toBe(Priority.NotDefined);
    expect(normalizePriority(null)).toBe(Priority.NotDefined);
    expect(normalizePriority('unsupported')).toBe(Priority.NotDefined);
    expect(normalizePriority(Priority.High)).toBe(Priority.High);
  });
});
