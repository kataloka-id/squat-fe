/** @vitest-environment jsdom */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MultiSelect } from './MultiSelect.tsx';

afterEach(cleanup);

describe('MultiSelect', () => {
  const props = { label: 'Tags', selectedValues: [], onChange: vi.fn(), options: [] };

  it('renders an explicit non-selectable empty state', () => {
    render(<MultiSelect {...props} emptyMessage="No tags available" />);
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));
    expect(screen.getByRole('status').textContent).toContain('No tags available');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('renders loading and failed states with retry', () => {
    const retry = vi.fn();
    const { rerender } = render(<MultiSelect {...props} loading />);
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));
    expect(screen.getByRole('status').textContent).toContain('Loading...');
    rerender(<MultiSelect {...props} error="Failed to load options" onRetry={retry} />);
    expect(screen.getByRole('alert').textContent).toContain('Failed to load options');
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading options' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('keeps populated options selectable', () => {
    const onChange = vi.fn();
    render(<MultiSelect label="Status" selectedValues={[]} onChange={onChange} options={[{ label: 'Active', value: 'active' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Status' }));
    fireEvent.click(screen.getByText('Active'));
    expect(onChange).toHaveBeenCalledWith(['active']);
  });
});
