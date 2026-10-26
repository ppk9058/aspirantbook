import { useState, useEffect } from "react";

/**
 * Hook to debounce any fast-changing value (e.g. search input).
 * Defaults to 300ms delay.
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * Standard debounce function for callback execution.
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number = 300
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timer: NodeJS.Timeout | null = null;
  const debounced = (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delayMs);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
  };
  return debounced;
}
