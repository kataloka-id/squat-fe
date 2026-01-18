import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RegistrationData {
  fullName: string;
  phone: string;
  email: string;
}

interface OnboardingStore {
  registration: RegistrationData;
  setRegistration: (data: RegistrationData) => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      registration: {
        fullName: '',
        phone: '+62',
        email: '',
      },

      setRegistration: (data) =>
        set({
          registration: data,
        }),

      resetOnboarding: () =>
        set({
          registration: {
            fullName: '',
            phone: '+62',
            email: '',
          },
        }),
    }),
    {
      name: 'onboarding-storage',
    },
  ),
);
