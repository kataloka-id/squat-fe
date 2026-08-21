import { fireEvent, screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

export const selectCustomOption = async (user: UserEvent, label: string | RegExp, value: string) => {
  await user.click(screen.getByRole('button', { name: label }));
  const option = screen.getAllByRole('option', { hidden: true }).find((item) => item.getAttribute('data-value') === value);
  if (!option) throw new Error(`Custom Select option not found: ${value}`);
  await user.click(option);
};

export const selectCustomOptionSync = (label: string | RegExp, value: string) => {
  fireEvent.click(screen.getByRole('button', { name: label }));
  const option = screen.getAllByRole('option', { hidden: true }).find((item) => item.getAttribute('data-value') === value);
  if (!option) throw new Error(`Custom Select option not found: ${value}`);
  fireEvent.click(option);
};
