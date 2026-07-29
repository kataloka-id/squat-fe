/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompanyIdentity } from './CompanyIdentity.tsx';
import { CompanyLogo } from './CompanyLogo.tsx';
import { COMPANY_BRAND_SHADES, contrastRatio, getCompanyBrandTokens } from './company-brand.ts';

const companies = vi.hoisted(() => ({ getLogoBlob: vi.fn() }));
vi.mock('@/src/api/companies.service.ts', () => ({ CompaniesService: companies }));

const company = { id: 'c1', name: 'Acme', hasLogo: true, logoVersion: 'v1', profileColour: '#123456' };

describe('company identity', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sets every runtime brand shade and central title with a contrast-safe primary shade', () => {
    const tokens = getCompanyBrandTokens('#ffffff');
    const { rerender } = render(<CompanyIdentity company={{ ...company, profileColour: '#ffffff' }} />);
    COMPANY_BRAND_SHADES.forEach((shade) => expect(document.documentElement.style.getPropertyValue(`--company-brand-${shade}-rgb`)).toBe(tokens[shade]));
    const [red, green, blue] = tokens[600].split(' ').map(Number);
    expect(contrastRatio({ red: 255, green: 255, blue: 255 }, { red, green, blue })).toBeGreaterThanOrEqual(4.5);
    expect(document.title).toBe('Acme | Portal Access');
    rerender(<CompanyIdentity company={null} />);
    expect(document.title).toBe('Portal Access');
  });

  it('renders a fetched authenticated blob logo and revokes its object URL', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:company-logo');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    companies.getLogoBlob.mockResolvedValue(new Blob(['logo'], { type: 'image/png' }));
    const { unmount } = render(<CompanyLogo company={company} />);
    await waitFor(() => expect(screen.getByAltText('Acme logo').getAttribute('src')).toBe('blob:company-logo'));
    expect(screen.getByAltText('Acme logo').className).toContain('object-contain');
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:company-logo');
    createObjectURL.mockRestore(); revokeObjectURL.mockRestore();
  });

  it('falls back to the company initial when metadata is absent or the blob request/image fails', async () => {
    const { rerender } = render(<CompanyLogo company={{ ...company, hasLogo: false, logoVersion: null }} />);
    expect(screen.getByLabelText('Acme initial')).not.toBeNull();
    companies.getLogoBlob.mockRejectedValue({ message: 'Not found' });
    rerender(<CompanyLogo company={company} />);
    await waitFor(() => expect(screen.getByLabelText('Acme initial')).not.toBeNull());
    companies.getLogoBlob.mockResolvedValue(new Blob(['logo']));
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:broken');
    rerender(<CompanyLogo company={{ ...company, logoVersion: 'v2' }} />);
    await waitFor(() => fireEvent.error(screen.getByAltText('Acme logo')));
    expect(screen.getByLabelText('Acme initial')).not.toBeNull();
  });

  it('uses a decoded authenticated company logo as the favicon and revokes it on cleanup', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:company-favicon');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    class DecodedImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) { this.onload?.(); }
    }
    vi.stubGlobal('Image', DecodedImage);
    companies.getLogoBlob.mockResolvedValue(new Blob(['logo'], { type: 'image/png' }));
    const { unmount } = render(<CompanyIdentity company={company} />);
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')!;
    expect(icon.href).toContain('/favicon.svg');
    await waitFor(() => expect(icon.href).toBe('blob:company-favicon'));
    expect(icon.type).toBe('image/png');
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:company-favicon');
    expect(icon.href).toContain('/favicon.svg');
    createObjectURL.mockRestore(); revokeObjectURL.mockRestore();
  });

  it('keeps the static favicon when the authenticated logo request or decode fails', async () => {
    companies.getLogoBlob.mockRejectedValue({ message: 'Not found' });
    const { rerender } = render(<CompanyIdentity company={company} />);
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')!;
    await waitFor(() => expect(icon.href).toContain('/favicon.svg'));
    class BrokenImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) { this.onerror?.(); }
    }
    vi.stubGlobal('Image', BrokenImage);
    companies.getLogoBlob.mockResolvedValue(new Blob(['logo'], { type: 'image/png' }));
    rerender(<CompanyIdentity company={{ ...company, logoVersion: 'v2' }} />);
    await waitFor(() => expect(icon.href).toContain('/favicon.svg'));
  });
});
