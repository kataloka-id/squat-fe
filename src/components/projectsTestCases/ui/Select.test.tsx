/** @vitest-environment jsdom */
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Select } from './Select.tsx';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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

  it('portals long options outside clipping containers and keeps them selectable while anchored on scroll', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 640 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 480 });
    let triggerLeft = 520;
    let triggerTop = 120;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getRect() {
      if (this.getAttribute('role') === 'listbox') {
        return { bottom: 0, height: 120, left: 0, right: 280, top: 0, width: 280, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      }
      return {
        bottom: triggerTop + 32, height: 32, left: triggerLeft, right: triggerLeft + 128,
        top: triggerTop, width: 128, x: triggerLeft, y: triggerTop, toJSON: () => ({}),
      } as DOMRect;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function getOffsetWidth() {
      return this.getAttribute('role') === 'listbox' ? 280 : 0;
    });

    const onChange = vi.fn();
    const { container } = render(
      <div className="overflow-hidden">
        <Select
          value=""
          placeholder="Move to…"
          options={[{ label: 'A folder with a deliberately long name', value: 'folder-1' }]}
          onChange={onChange}
          className="w-32"
        />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Move to…' }));
    const menu = screen.getByRole('listbox', { name: 'Move to…' });
    const option = screen.getByRole('option', { name: 'A folder with a deliberately long name' });
    expect(menu.parentElement).toBe(document.body);
    expect(container.querySelector('.overflow-hidden')?.contains(menu)).toBe(false);
    expect(menu.className).toContain('fixed');
    expect(menu.style.left).toBe('352px');

    triggerLeft = 80;
    triggerTop = 300;
    window.dispatchEvent(new Event('scroll'));
    await waitFor(() => {
      expect(menu.style.left).toBe('80px');
      expect(menu.style.top).toBe('336px');
    });

    fireEvent.click(option);
    expect(onChange).toHaveBeenCalledWith('folder-1');
  });

  it('supports keyboard opening, option navigation, selection, and escape', () => {
    const onChange = vi.fn();
    render(<Select value="a" onChange={onChange} placeholder="Priority" options={[{ label: 'Alpha', value: 'a' }, { label: 'Beta', value: 'b' }]} />);
    const trigger = screen.getByRole('button', { name: 'Priority' });

    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(document.body.contains(screen.getByRole('listbox', { name: 'Priority' }))).toBe(true);
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('b');

    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('listbox', { name: 'Priority' })).toBeNull();
  });
});
