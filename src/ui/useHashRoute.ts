import { useSyncExternalStore } from 'react';

const sub = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

/** "#/niveau/L01" → ["niveau", "L01"] */
export function useHashRoute(): string[] {
  const hash = useSyncExternalStore(sub, () => location.hash);
  return hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
}

export const go = (path: string) => { location.hash = path; };
