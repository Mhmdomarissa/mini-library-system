import { useEffect, useState } from 'react';

/**
 * Debounce a value by the given delay (in ms).
 * Returns the debounced value that only updates after `delay` ms of inactivity.
 *
 * Usage:
 *   const debouncedSearch = useDebounce(search, 300);
 *   useEffect(() => { fetch(debouncedSearch); }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
