import { useEffect, useState } from 'react';
import type { CompanyRecord } from '@/src/types/api.ts';
import { CompaniesService } from '@/src/api/companies.service.ts';

interface CompanyLogoProps {
  company: Pick<CompanyRecord, 'id' | 'name' | 'hasLogo' | 'logoVersion'> | null | undefined;
  className?: string;
  previewUrl?: string | null;
}

const companyInitial = (name?: string | null) => name?.trim().slice(0, 1).toUpperCase() || 'C';

export const CompanyLogo = ({ company, className = '', previewUrl = null }: CompanyLogoProps) => {
  const logoKey = `${company?.id ?? 'none'}:${company?.logoVersion ?? 'none'}`;
  const [fetchedLogo, setFetchedLogo] = useState<{ key: string; url: string } | null>(null);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const name = company?.name?.trim() || 'Company';

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    if (!company?.hasLogo) return () => undefined;

    void CompaniesService.getLogoBlob()
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setFetchedLogo({ key: logoKey, url: objectUrl });
      })
      .catch(() => {
        if (active) setFetchedLogo(null);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [company?.hasLogo, logoKey]);

  const imageUrl = previewUrl ?? (company?.hasLogo && fetchedLogo?.key === logoKey ? fetchedLogo.url : null);
  const visibleImageUrl = imageUrl === failedImageUrl ? null : imageUrl;

  if (!visibleImageUrl) {
    return <span aria-label={`${name} initial`} className={`flex items-center justify-center bg-slate-700 text-sm font-bold text-white ${className}`}>{companyInitial(name)}</span>;
  }

  return <img src={visibleImageUrl} alt={`${name} logo`} className={`object-contain ${className}`} onError={() => setFailedImageUrl(visibleImageUrl)} />;
};
