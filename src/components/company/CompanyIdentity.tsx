import { useEffect } from 'react';
import type { CompanyRecord } from '@/src/types/api.ts';
import {
  COMPANY_BRAND_SHADES,
  getCompanyBrandTokens,
  resolveCompanyBrandColour,
} from './company-brand.ts';
import { CompaniesService } from '@/src/api/companies.service.ts';

const fallbackTitle = 'Portal Access';
const fallbackFavicon = '/favicon.svg';

const faviconLink = () => {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  return link;
};

const resetFavicon = (link: HTMLLinkElement) => {
  link.href = fallbackFavicon;
  link.type = 'image/svg+xml';
};

const decodeImage = (source: string) => new Promise<void>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve();
  image.onerror = () => reject(new Error('Company logo cannot be decoded'));
  image.src = source;
});

export const CompanyIdentity = ({ company }: { company: CompanyRecord | null | undefined }) => {
  useEffect(() => {
    const colour = resolveCompanyBrandColour(company?.profileColour);
    const tokens = getCompanyBrandTokens(colour);
    document.documentElement.style.setProperty('--company-brand', colour);
    COMPANY_BRAND_SHADES.forEach((shade) =>
      document.documentElement.style.setProperty(`--company-brand-${shade}-rgb`, tokens[shade]),
    );
    document.title = company?.name?.trim()
      ? `${company.name.trim()} | Portal Access`
      : fallbackTitle;
  }, [company?.name, company?.profileColour]);

  useEffect(() => {
    const link = faviconLink();
    let active = true;
    let objectUrl: string | null = null;
    resetFavicon(link);

    if (!company?.hasLogo || !company.logoVersion) return () => undefined;

    void Promise.resolve(CompaniesService.getLogoBlob())
      .then(async (blob) => {
        objectUrl = URL.createObjectURL(blob);
        await decodeImage(objectUrl);
        if (!active) return;
        link.href = objectUrl;
        link.type = blob.type || 'image/png';
      })
      .catch(() => {
        if (active) resetFavicon(link);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resetFavicon(link);
    };
  }, [company?.hasLogo, company?.id, company?.logoVersion]);

  return null;
};
