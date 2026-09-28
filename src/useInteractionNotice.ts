import { useEffect, useRef, useState, useCallback } from 'react';

export default function useInteractionNotice() {
  const [notice, update] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setNotice = useCallback((message: string) => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    update(message);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const dismiss = () => {
      if (timer.current !== null) return;
      timer.current = setTimeout(() => { timer.current = null; update(''); }, 0);
    };
    const events = ['click', 'keyup', 'input', 'change', 'scroll', 'wheel', 'touchmove'];
    for (const event of events) document.addEventListener(event, dismiss, { capture: true, passive: true });
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
      for (const event of events) document.removeEventListener(event, dismiss, true);
    };
  }, [notice]);
  return [notice, setNotice] as const;
}
