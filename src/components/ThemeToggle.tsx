import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  const icons = {
    light: '☀️',
    dark: '🌙',
    system: '💻',
  };

  const labels = {
    light: '淺色',
    dark: '深色',
    system: '系統',
  };

  return (
    <button
      onClick={cycleTheme}
      className="fixed bottom-4 right-4 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg 
                 border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform z-50"
      title={`當前: ${labels[theme]}`}
    >
      {icons[theme]}
    </button>
  );
}
