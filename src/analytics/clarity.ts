import Clarity from '@microsoft/clarity';

const CLARITY_ID = import.meta.env.VITE_CLARITY_ID;

export const initClarity = () => {
  if (!CLARITY_ID) {
    console.warn('Clarity ID not found');
    return;
  }

  if (import.meta.env.MODE !== 'production') {
    console.info('Clarity disabled in non-production');
    return;
  }

  Clarity.init(CLARITY_ID);
};

export const trackEvent = (name: string, data?: Record<string, string | number | boolean>) => {
  if (import.meta.env.MODE !== 'production') return;
  Clarity.event(name);
};
