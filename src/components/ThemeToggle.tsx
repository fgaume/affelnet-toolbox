import './ThemeToggle.css';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
  mode: ThemeMode;
  onToggle: (mode: ThemeMode) => void;
}

const nextMode: Record<ThemeMode, ThemeMode> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

const labels: Record<ThemeMode, string> = {
  system: 'Thème : automatique',
  light: 'Thème : clair',
  dark: 'Thème : sombre',
};

export function ThemeToggle({ mode, onToggle }: ThemeToggleProps) {
  return (
    <button
      className="theme-toggle"
      onClick={() => onToggle(nextMode[mode])}
      aria-label={labels[mode]}
      title={labels[mode]}
    >
      {mode === 'light' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      )}
      {mode === 'dark' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
      {mode === 'system' && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      )}
    </button>
  );
}
