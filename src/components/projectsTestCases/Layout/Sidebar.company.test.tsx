/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionContext } from '@/src/auth/SessionContext.tsx';
import { Sidebar } from './Sidebar.tsx';

describe('Sidebar company identity', () => {
  afterEach(cleanup);
  it('renders a fixed company initial frame when blob logo metadata is absent', () => {
    render(<BrowserRouter><SessionContext.Provider value={{ id: 'u1', email: 'a@example.test', username: 'admin', roleSlug: 'admin', isActive: true, company: { id: 'c1', name: 'Acme QA', hasLogo: false, logoVersion: null, profileColour: '#ffffff' } }}><Sidebar currentView="projects" onNavigate={() => {}} /></SessionContext.Provider></BrowserRouter>);
    expect(screen.getAllByText('Acme QA')).toHaveLength(2);
    const fallback = screen.getByLabelText('Acme QA initial');
    expect(fallback.parentElement?.className).toContain('h-14');
    expect(fallback.parentElement?.className).toContain('w-14');
    expect(fallback.parentElement?.className).toContain('rounded-xl');
    expect(fallback.parentElement?.className).toContain('p-2');
    expect(fallback.className).toContain('h-full');
    expect(fallback.className).toContain('w-full');
    const toggle = screen.getByRole('button', { name: 'Collapse sidebar' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.className).toContain('min-h-[88px]');
    expect(toggle.className).toContain('rounded-2xl');
    expect(toggle.className).toContain('border-slate-700/80');
    expect(toggle.className).toContain('focus-visible:ring-brand-500');
    expect(toggle.className).not.toContain('company-brand-accent');
    expect(toggle.className).not.toContain('company-brand-ring');
    expect(toggle.className).not.toContain('shadow-glow');
  });

  it('keeps the fixed fallback visible after collapsing the sidebar', () => {
    render(<BrowserRouter><SessionContext.Provider value={{ id: 'u1', email: 'a@example.test', username: 'admin', roleSlug: 'admin', isActive: true, company: { id: 'c1', name: 'Acme QA', hasLogo: false, logoVersion: null, profileColour: '#000000' } }}><Sidebar currentView="projects" onNavigate={() => {}} /></SessionContext.Provider></BrowserRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(screen.getByRole('button', { name: 'Expand sidebar' }).getAttribute('aria-expanded')).toBe('false');
    const fallback = screen.getByLabelText('Acme QA initial');
    expect(fallback.parentElement?.className).toContain('h-8');
    expect(fallback.parentElement?.className).toContain('w-8');
    expect(fallback.parentElement?.className).toContain('p-1');
    expect(screen.getByRole('button', { name: 'Expand sidebar' }).className).toContain('w-11');
    expect(screen.getByRole('button', { name: 'Expand sidebar' }).className).toContain('h-11');
    expect(screen.getByRole('button', { name: 'Expand sidebar' }).parentElement?.className).toContain('justify-center');
  });

  it('preserves navigation behavior independently from the sidebar toggle', () => {
    const onNavigate = vi.fn();
    render(<BrowserRouter><SessionContext.Provider value={{ id: 'u1', email: 'a@example.test', username: 'admin', roleSlug: 'admin', isActive: true, company: { id: 'c1', name: 'Acme QA', hasLogo: false, logoVersion: null, profileColour: '#000000' } }}><Sidebar currentView="projects" onNavigate={onNavigate} /></SessionContext.Provider></BrowserRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    fireEvent.click(screen.getByRole('button', { name: /Test Cases/ }));
    expect(onNavigate).toHaveBeenCalledWith('test-cases');
  });

  it('shows the current session user above Sign Out in the expanded sidebar', () => {
    render(<BrowserRouter><SessionContext.Provider value={{ id: 'u1', email: 'a@example.test', username: 'Avery QA', roleSlug: 'kataloka_admin', isActive: true, company: { id: 'c1', name: 'Acme QA', hasLogo: false, logoVersion: null, profileColour: '#000000' } }}><Sidebar currentView="projects" onNavigate={() => {}} /></SessionContext.Provider></BrowserRouter>);

    const currentUser = screen.getByLabelText('Current user: Avery QA · Kataloka Admin, Acme QA');
    expect(currentUser.textContent).toContain('AQ');
    expect(currentUser.textContent).toContain('Avery QA');
    expect(currentUser.textContent).toContain('Kataloka Admin');
    expect(currentUser.textContent).toContain('Acme QA');
    expect(currentUser.nextElementSibling?.className).toContain('border-t');
    expect(screen.getByRole('button', { name: 'Sign Out' })).not.toBeNull();
  });

  it('truncates long current-user details without expanding the sidebar', () => {
    render(<BrowserRouter><SessionContext.Provider value={{ id: 'u1', email: 'a@example.test', username: 'A very long current user name that must stay inside the sidebar', roleSlug: 'quality_assurance_lead', isActive: true, company: { id: 'c1', name: 'A very long company name that must stay inside the sidebar', hasLogo: false, logoVersion: null, profileColour: '#000000' } }}><Sidebar currentView="projects" onNavigate={() => {}} /></SessionContext.Provider></BrowserRouter>);

    const currentUser = screen.getByLabelText(/Current user: A very long current user name/);
    expect(currentUser.querySelectorAll('.truncate')).toHaveLength(3);
    expect(currentUser.querySelector('.min-w-0')?.className).toContain('max-w-[180px]');
  });

  it('keeps only the user avatar visible with an informative tooltip when collapsed', () => {
    render(<BrowserRouter><SessionContext.Provider value={{ id: 'u1', email: 'a@example.test', username: 'Avery QA', roleSlug: 'qa', isActive: true, company: { id: 'c1', name: 'Acme QA', hasLogo: false, logoVersion: null, profileColour: '#000000' } }}><Sidebar currentView="projects" onNavigate={() => {}} /></SessionContext.Provider></BrowserRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    const currentUser = screen.getByLabelText('Current user: Avery QA · QA, Acme QA');
    expect(currentUser.className).toContain('justify-center');
    expect(currentUser.querySelector('.max-w-0')).not.toBeNull();
    expect(screen.getByRole('tooltip').textContent).toContain('Avery QA');
    expect(screen.getByRole('tooltip').textContent).toContain('QA');
  });
});
