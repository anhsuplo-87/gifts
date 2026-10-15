import { useEffect, useState } from 'preact/hooks';
import { computePx } from '../voucher/layout.ts';

/** Đặt --px (số nguyên) lên <html> theo kích thước cửa sổ; trả về giá trị hiện tại */
export function usePx(): number {
  const [px, setPx] = useState(() => computePx(window.innerWidth, window.innerHeight));
  useEffect(() => {
    const update = () => setPx(computePx(window.innerWidth, window.innerHeight));
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty('--px', `${px}px`);
  }, [px]);
  return px;
}

const RM = '(prefers-reduced-motion: reduce)';
export const prefersReducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia(RM).matches;

export function useReducedMotion(): boolean {
  const [rm, setRm] = useState(prefersReducedMotion);
  useEffect(() => {
    const mq = matchMedia(RM);
    const on = () => setRm(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return rm;
}
