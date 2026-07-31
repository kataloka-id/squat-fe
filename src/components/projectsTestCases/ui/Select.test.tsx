/** @vitest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './Select.tsx';

describe('Select', () => {
  it('renders a pending bulk move control as disabled and allows it again after the request completes', () => {
    const props = {
      value: '',
      options: [{ label: 'Unfiled', value: '__unfiled__' }],
      onChange: vi.fn(),
    };
    const { rerender } = render(<Select {...props} disabled placeholder="Moving…" />);

    const pendingControl = screen.getByRole('button', { name: 'Moving…' }) as HTMLButtonElement;
    expect(pendingControl.disabled).toBe(true);

    rerender(<Select {...props} disabled={false} placeholder="Move to…" />);
    expect((screen.getByRole('button', { name: 'Move to…' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
