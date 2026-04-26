'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/lib/store';

/**
 * Applies the active theme via `data-theme` attribute on <html>. CSS
 * variables in globals.css cascade per attribute. Lives at the root so
 * theme changes propagate to every component via inherited custom props.
 */
export default function ThemeProvider() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
    // Also update theme-color meta for browser chrome — picks bg-color of theme
    const META: Record<string, string> = {
      default:  '#0a0a0d',
      colorful: '#150709',
      light:    '#fff1e5',
      ocean:    '#0a1228',
      sentris:  '#0a0a0c',
    };
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = META[theme] ?? '#0c0c10';
  }, [theme]);

  return null;
}
