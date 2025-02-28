/**
 * Formats a column name from snake_case to Title Case with spaces
 * Example: id_pedido -> Id Pedido
 */
export function formatColumnName(columnName: string): string {
  // Handle cases where column includes data type like "id_empleado (INT)"
  const nameOnly = columnName.split(' ')[0];
  
  return nameOnly
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Save state to localStorage
 */
export function saveToLocalStorage<T>(key: string, value: T): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

/**
 * Load state from localStorage
 */
export function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    }
    return defaultValue;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return defaultValue;
  }
}

/**
 * Logger utility for consistent logging
 */
export const logger = {
  info: (message: string, data?: any) => {
    console.info(`[INFO] ${message}`, data || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data || '');
  }
};
