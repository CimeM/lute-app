import { useState, useEffect } from 'react';

export const READER_BACKGROUND_OPTIONS = [
  { value: 'theme', label: 'Match app theme' },
  { value: 'light', label: 'Light', backgroundColor: '#f8fafc' },
  { value: 'sepia', label: 'Sepia', backgroundColor: '#fbf0d9' },
  { value: 'dark', label: 'Dark', backgroundColor: '#09090b' },
];

export function getReaderBackgroundStyles(background, themeStyles) {
  const option = READER_BACKGROUND_OPTIONS.find((entry) => entry.value === background);
  if (!option || option.value === 'theme') return themeStyles.readerBackground;

  return {
    backgroundColor: option.backgroundColor,
    color: background === 'dark' ? '#f4f4f5' : background === 'sepia' ? '#451a03' : '#0f172a',
  };
}

export function useResolvedTheme(themeSetting) {
  const [systemIsDark, setSystemIsDark] = useState(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setSystemIsDark(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  if (themeSetting === 'system' || themeSetting === 'sepia') {
    return systemIsDark ? 'dark' : 'light';
  }
  return themeSetting || 'dark';
}

export function getThemeStyles(theme) {
  if (theme === 'light') {
    return {
      bodyBg: 'bg-slate-100 text-slate-900',
      appBg: 'bg-slate-200',
      readerBackground: { backgroundColor: '#f8fafc', color: '#0f172a' },
      containerBg: 'bg-white border-slate-200',
      headerBg: 'bg-slate-50/90 border-slate-200 text-slate-800',
      navBg: 'bg-slate-50 border-slate-200',
      navActive: 'text-amber-600 bg-amber-100/80',
      navInactive: 'text-slate-500 hover:text-slate-800',
      cardBg: 'bg-slate-50 border-slate-200/80 text-slate-800',
      cardHover: 'hover:border-slate-300',
      textPrimary: 'text-slate-900',
      textMuted: 'text-slate-500',
      textSubtle: 'text-slate-400',
      inputBg: 'bg-white border-slate-200 text-slate-800 focus:border-amber-500',
      btnSecondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200',
      modalBg: 'bg-white/95 border-slate-200 text-slate-800',
      statusBadge: 'bg-slate-200 text-slate-700 border-slate-300',
    };
  }
  return {
    bodyBg: 'bg-zinc-950 text-zinc-100',
    appBg: 'bg-zinc-950',
    readerBackground: { backgroundColor: '#09090b', color: '#f4f4f5' },
    containerBg: 'bg-zinc-900 border-zinc-800',
    headerBg: 'bg-zinc-950/80 border-zinc-800 text-zinc-200',
    navBg: 'bg-zinc-950 border-zinc-800',
    navActive: 'text-amber-400 bg-zinc-800/60',
    navInactive: 'text-zinc-500 hover:text-zinc-300',
    cardBg: 'bg-zinc-950 border-zinc-800/80 text-zinc-200',
    cardHover: 'hover:border-zinc-700',
    textPrimary: 'text-zinc-100',
    textMuted: 'text-zinc-400',
    textSubtle: 'text-zinc-500',
    inputBg: 'bg-zinc-900 border-zinc-800 text-zinc-200 focus:border-amber-500',
    btnSecondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300',
    modalBg: 'bg-zinc-950 border-zinc-800 text-zinc-100',
    statusBadge: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  };
}