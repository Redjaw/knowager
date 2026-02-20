export type ThemePreference = 'light' | 'dark';

export function normalizeThemePreference(value: string | null | undefined): ThemePreference {
  return value === 'dark' ? 'dark' : 'light';
}

export function applyThemePreference(theme: ThemePreference) {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const isDark = theme === 'dark';

  root.classList.toggle('dark', isDark);
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}
