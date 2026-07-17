import { create } from 'zustand';
import type { User } from '@workspace/api-client-react';

interface StoreState {
  stepFreeOnly: boolean;
  setStepFreeOnly: (val: boolean) => void;
  mockTime: number;
  incrementMockTime: () => void;
  language: 'en' | 'es' | 'fr' | 'pt' | 'ar';
  setLanguage: (lang: 'en' | 'es' | 'fr' | 'pt' | 'ar') => void;
  token: string | null;
  user: User | null;
  setAuth: (token: string | null, user: User | null) => void;
  greenPoints: number;
  addGreenPoints: (amount: number) => void;
  spendGreenPoints: (amount: number) => void;
  textMagnified: boolean;
  setTextMagnified: (val: boolean) => void;
  colorContrastBoosted: boolean;
  setColorContrastBoosted: (val: boolean) => void;
  screenReaderSynthesis: boolean;
  setScreenReaderSynthesis: (val: boolean) => void;
}

// Read initial values from localStorage
const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
const storedLang = typeof window !== 'undefined' ? localStorage.getItem('language') : 'en';
const storedPoints = typeof window !== 'undefined' ? localStorage.getItem('greenPoints') : null;
const storedMagnified = typeof window !== 'undefined' ? localStorage.getItem('textMagnified') : null;
const storedContrast = typeof window !== 'undefined' ? localStorage.getItem('colorContrastBoosted') : null;
const storedSpeech = typeof window !== 'undefined' ? localStorage.getItem('screenReaderSynthesis') : null;

export const useStore = create<StoreState>((set) => ({
  stepFreeOnly: false,
  setStepFreeOnly: (val) => set({ stepFreeOnly: val }),
  mockTime: Date.now(),
  incrementMockTime: () => set((state) => ({ mockTime: state.mockTime + 8000 })),
  language: (storedLang as any) || 'en',
  setLanguage: (lang) => {
    localStorage.setItem('language', lang);
    set({ language: lang });
  },
  token: storedToken,
  user: storedUser ? JSON.parse(storedUser) : null,
  setAuth: (token, user) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
    set({ token, user });
  },
  greenPoints: storedPoints ? parseInt(storedPoints, 10) : 450,
  addGreenPoints: (amount) => set((state) => {
    const nextPoints = state.greenPoints + amount;
    localStorage.setItem('greenPoints', nextPoints.toString());
    return { greenPoints: nextPoints };
  }),
  spendGreenPoints: (amount) => set((state) => {
    const nextPoints = Math.max(0, state.greenPoints - amount);
    localStorage.setItem('greenPoints', nextPoints.toString());
    return { greenPoints: nextPoints };
  }),
  textMagnified: storedMagnified === 'true',
  setTextMagnified: (val) => set(() => {
    localStorage.setItem('textMagnified', String(val));
    if (typeof document !== 'undefined') {
      if (val) {
        document.documentElement.classList.add('accessibility-magnified');
      } else {
        document.documentElement.classList.remove('accessibility-magnified');
      }
    }
    return { textMagnified: val };
  }),
  colorContrastBoosted: storedContrast === 'true',
  setColorContrastBoosted: (val) => set(() => {
    localStorage.setItem('colorContrastBoosted', String(val));
    if (typeof document !== 'undefined') {
      if (val) {
        document.documentElement.classList.add('accessibility-contrast');
      } else {
        document.documentElement.classList.remove('accessibility-contrast');
      }
    }
    return { colorContrastBoosted: val };
  }),
  screenReaderSynthesis: storedSpeech === 'true',
  setScreenReaderSynthesis: (val) => set(() => {
    localStorage.setItem('screenReaderSynthesis', String(val));
    return { screenReaderSynthesis: val };
  }),
}));
