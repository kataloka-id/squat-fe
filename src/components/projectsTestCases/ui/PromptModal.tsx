import React, { useState } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  label: string;
  initialValue?: string;
  submitLabel: string;
  isSubmitting?: boolean;
  error?: string | null;
  // eslint-disable-next-line no-unused-vars
  onSubmit: (value: string) => void;
  onClose: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({ isOpen, title, label, initialValue = '', submitLabel, isSubmitting = false, error, onSubmit, onClose }) => {
  const [value, setValue] = useState(initialValue);
  const valid = value.trim().length > 0;
  return (
    <Modal isOpen={isOpen} title={title} onClose={onClose} closeDisabled={isSubmitting}>
      <form onSubmit={(event) => { event.preventDefault(); if (valid && !isSubmitting) onSubmit(value.trim()); }}>
        <div className="space-y-2 p-5">
          <label htmlFor="app-prompt-input" className="block text-sm font-medium text-slate-700">{label}</label>
          <input id="app-prompt-input" autoFocus value={value} onChange={(event) => setValue(event.target.value)} disabled={isSubmitting} aria-invalid={Boolean(error)} aria-describedby={error ? 'app-prompt-error' : undefined} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-100" />
          {error && <p id="app-prompt-error" role="alert" className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/50 p-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={!valid || isSubmitting}>{isSubmitting ? 'Creating…' : submitLabel}</Button>
        </div>
      </form>
    </Modal>
  );
};
