import { useState, useEffect } from 'react';

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

  if (themeSetting === 'system') {
    return systemIsDark ? 'dark' : 'light';
  }
  return themeSetting || 'dark';
}

export const READER_BACKGROUND_OPTIONS = [
  { value: 'theme', label: 'Match theme', backgroundColor: null, color: null },
  { value: 'white', label: 'White', backgroundColor: '#ffffff', color: '#18181b' },
  { value: 'paper', label: 'Paper yellow', backgroundColor: '#f4e4c1', color: '#451a03' },
  { value: 'gray', label: 'Soft gray', backgroundColor: '#e7e5e4', color: '#292524' },
  { value: 'sage', label: 'Soft green', backgroundColor: '#e5eee5', color: '#1c3325' },
  { value: 'dark', label: 'Dark', backgroundColor: '#18181b', color: '#f4f4f5' },
];

export function getReaderBackgroundStyles(background, themeStyles) {
  const option = READER_BACKGROUND_OPTIONS.find((item) => item.value === background);
  if (!option || option.value === 'theme') return themeStyles.readerBackground;
  return { backgroundColor: option.backgroundColor, color: option.color };
}

export function getThemeStyles(theme) {
  if (theme === 'light') {
    return {
      statusBarColor: '#e2e8f0',
      readerBackground: { backgroundColor: '#f8fafc', color: '#0f172a' },
      bodyBg: 'bg-slate-100 text-slate-900',
      appBg: 'bg-slate-200',
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
  if (theme === 'sepia') {
    return {
      statusBarColor: '#f4e4c1',
      readerBackground: { backgroundColor: '#fbf0d9', color: '#451a03' },
      bodyBg: 'bg-amber-100 text-amber-950',
      appBg: 'bg-amber-200/60',
      containerBg: 'bg-[#fbf0d9] border-amber-200/80',
      headerBg: 'bg-[#f4e4c1]/90 border-amber-200/80 text-amber-950',
      navBg: 'bg-[#f4e4c1] border-amber-200/80',
      navActive: 'text-amber-900 bg-amber-200/70',
      navInactive: 'text-amber-800/60 hover:text-amber-950',
      cardBg: 'bg-[#f4e4c1]/60 border-amber-200/80 text-amber-950',
      cardHover: 'hover:border-amber-300',
      textPrimary: 'text-amber-950',
      textMuted: 'text-amber-800/70',
      textSubtle: 'text-amber-800/50',
      inputBg: 'bg-[#fbf0d9] border-amber-200 text-amber-950 focus:border-amber-600',
      btnSecondary: 'bg-amber-200/50 hover:bg-amber-200 text-amber-950 border border-amber-200',
      modalBg: 'bg-[#fbf0d9]/95 border-amber-200 text-amber-950',
      statusBadge: 'bg-amber-200/60 text-amber-900 border-amber-300/60',
    };
  }
  return {
    statusBarColor: '#09090b',
    readerBackground: { backgroundColor: '#09090b', color: '#f4f4f5' },
    bodyBg: 'bg-zinc-950 text-zinc-100',
    appBg: 'bg-zinc-950',
    containerBg: 'bg-zinc-900 border-zinc-800',
    headerBg: 'bg-zinc-950/80 border-zinc-800 text-zinc-200',
    navBg: 'bg-zinc-950 border-zinc-800',
    navActive: 'text-amber-400 bg-zinc-800/60',
    navInactive: 'text-zinc-500 hover:text-zinc-300',
    cardBg: 'bg-zinc-950/60 border-zinc-800/80 text-zinc-200',
    cardHover: 'hover:border-zinc-700',
    textPrimary: 'text-zinc-100',
    textMuted: 'text-zinc-400',
    textSubtle: 'text-zinc-500',
    inputBg: 'bg-zinc-900 border-zinc-800 text-zinc-200 focus:border-amber-500',
    btnSecondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300',
    modalBg: 'bg-zinc-950/95 border-zinc-800 text-zinc-100',
    statusBadge: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  };
}