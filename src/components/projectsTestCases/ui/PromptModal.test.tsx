/** @vitest-environment jsdom */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PromptModal } from './PromptModal.tsx';

describe('PromptModal', () => {
  afterEach(cleanup);

  it('keeps submit disabled for blank input and submits trimmed value with Enter', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PromptModal isOpen title="Create Folder" label="Folder name" submitLabel="Create Folder" onSubmit={onSubmit} onClose={() => {}} />);
    const submit = screen.getByRole('button', { name: 'Create Folder' });
    expect(submit.hasAttribute('disabled')).toBe(true);
    await user.type(screen.getByLabelText('Folder name'), '  QA  ');
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('QA');
  });

  it('closes on Escape and exposes inline errors', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PromptModal isOpen title="Create Folder" label="Folder name" submitLabel="Create Folder" error="Folder already exists" onSubmit={() => {}} onClose={onClose} />);
    expect(screen.getByRole('alert').textContent).toContain('Folder already exists');
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
