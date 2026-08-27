// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { UserFlowHealthHelp } from './UserFlowHealthHelp.tsx';

afterEach(cleanup);

describe('UserFlowHealthHelp', () => {
  it('explains the current execution-derived Health classifications', async () => {
    const user = userEvent.setup();
    render(<UserFlowHealthHelp />);

    await user.click(screen.getByRole('button', { name: 'Explain User Flow Health' }));

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toContain('latest Test Run');
    expect(tooltip.textContent).toContain('Healthy:');
    expect(tooltip.textContent).toContain('At Risk:');
    expect(tooltip.textContent).toContain('Broken:');
    expect(tooltip.textContent).toContain('Unknown:');
    expect(tooltip.textContent).toContain('Critical is a Priority');
    expect(tooltip.textContent).toContain('N/A is used for unavailable coverage');
  });
});
