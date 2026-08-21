/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chip } from './Chip.tsx';

describe('Chip', () => {
  afterEach(() => cleanup());

  it.each([
    ['priority', 'Critical', 'bg-red-50'],
    ['status', 'Ready', 'bg-emerald-50'],
    ['health', 'unknown', 'bg-slate-100'],
    ['automation', 'UI', 'bg-violet-50'],
    ['automationReadiness', 'Automated', 'bg-emerald-50'],
    ['testRunType', 'Mixed', 'bg-violet-50'],
    ['assignee', 'qa_dayadi', 'bg-slate-50'],
    ['section', 'Checkout / Authentication', 'bg-slate-50'],
  ] as const)('maps %s/%s to the shared visual tone', (type, value, tone) => {
    render(<Chip type={type} value={value} />);
    const displayValue = type === 'health' || type === 'assignee' ? value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : value;
    expect(screen.getByText(type === 'health' ? 'Unknown' : displayValue).parentElement?.className).toContain(tone);
  });

  it('keeps the full long value available through the tooltip while allowing truncation', () => {
    const value = 'A very long section name that remains available on hover';
    render(<Chip type="section" value={value} className="w-40" />);
    expect(screen.getByTitle(value).textContent).toBe(value);
    expect(screen.getByTitle(value).className).toContain('max-w-[16rem]');
    expect(screen.getByTitle(value).className).toContain('truncate');
  });

  it.each([
    ['priority', 'Medium'],
    ['priority', 'Not Defined'],
    ['status', 'Unknown'],
    ['automationReadiness', 'Candidate'],
  ] as const)('does not shrink the normal %s label %s', (type, value) => {
    render(<Chip type={type} value={value} />);
    const text = screen.getByText(value);
    expect(text.className).toContain('shrink-0');
    expect(text.className).toContain('whitespace-nowrap');
    expect(text.className).not.toContain('truncate');
  });

  it('preserves interactive semantics and focus affordance', async () => {
    const onClick = vi.fn();
    render(<Chip type="status" value="Draft" onClick={onClick} />);
    const chip = screen.getByRole('button', { name: 'Draft' });
    chip.click();
    expect(onClick).toHaveBeenCalledOnce();
    expect(chip.className).toContain('focus-visible:ring-2');
  });
});
