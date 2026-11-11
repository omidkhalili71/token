import { useEffect, useState } from "react";

/** با debounce ۳۰۰ms از spec، ورودی جستجو را به مقدار قابل استفاده در query تبدیل می‌کند. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
