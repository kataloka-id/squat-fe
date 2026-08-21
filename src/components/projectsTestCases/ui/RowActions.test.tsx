// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { RowActions } from './RowActions.tsx';

afterEach(cleanup);

it('renders direct actions with tooltip labels and invokes them', async () => {
  const user = userEvent.setup();
  const edit = vi.fn();
  render(<RowActions actions={[{ label: 'Edit', icon: <span />, onClick: edit }]} />);
  await user.click(screen.getByRole('button', { name: 'Edit' }));
  expect(edit).toHaveBeenCalledOnce();
  expect(screen.queryByRole('tooltip', { name: 'Edit' })).toBeNull();
});

it('omits unauthorized actions and supports disabled actions', () => {
  render(<RowActions actions={[{ label: 'View', icon: <span />, onClick: vi.fn() }, { label: 'Delete', icon: <span />, onClick: vi.fn(), disabled: true }]} />);
  expect((screen.getByRole('button', { name: 'View' }) as HTMLButtonElement).disabled).toBe(false);
  expect((screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement).disabled).toBe(true);
});
