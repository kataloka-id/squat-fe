// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { InfoPopover } from './InfoPopover.tsx';
import { getPosition } from './infoPopoverPosition.ts';
import { afterEach } from 'vitest';

afterEach(cleanup);

describe('InfoPopover', () => {
  it.each([
    ['Status', 'Status ditentukan dari execution result'],
    ['Type', 'Type dari automation source'],
    ['Result', 'Passed 8 Failed 2 Blocked 1 Skipped 0 Not Run 5'],
  ])('renders the full %s explanation in a portal', async (label, content) => {
    const user = userEvent.setup();
    const { container } = render(
      <div style={{ overflow: 'hidden', height: 20 }}>
        <InfoPopover label={`Explain ${label}`}>
          <span>{content}</span>
        </InfoPopover>
      </div>,
    );
    await user.click(screen.getByRole('button', { name: `Explain ${label}` }));
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toContain(content);
    expect(tooltip.parentElement).toBe(document.body);
    expect(container.querySelector('[data-info-popover-panel]')).toBeNull();
  });

  it('opens on keyboard focus and closes with Escape', async () => {
    const user = userEvent.setup();
    render(
      <InfoPopover label="Explain status">
        <span>Status help</span>
      </InfoPopover>,
    );
    const trigger = screen.getByRole('button', { name: 'Explain status' });
    trigger.focus();
    expect((await screen.findByRole('tooltip')).textContent).toContain('Status help');
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('flips to the side with the most available viewport space', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });
    const panel = { width: 240, height: 120 } as DOMRect;
    expect(
      getPosition(
        { top: 8, bottom: 28, left: 300, right: 320, width: 20, height: 20 } as DOMRect,
        panel,
      ).placement,
    ).toBe('bottom');
    expect(
      getPosition(
        { top: 570, bottom: 590, left: 300, right: 320, width: 20, height: 20 } as DOMRect,
        panel,
      ).placement,
    ).toBe('top');
  });
});
