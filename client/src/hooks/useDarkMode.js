import { useEffect, useState } from 'react';

export default function useDarkMode() {
  // Inisialisasi: baca localStorage atau preferensi OS
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Efek: sinkronkan class di <html> dan localStorage dengan state
  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return {
    dark,
    toggle: () => setDark(prev => !prev),
  };
}
