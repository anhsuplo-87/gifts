// Màn tiết lộ: voucher trắng + "?" nhấp nháy → chạm → tan từng pixel (~700ms, theo bước) → lộ mặt trước.
import { useEffect, useRef, useState } from 'preact/hooks';
import { commonImg, u } from '../ui/tokens.ts';
import { VOUCHER } from './layout.ts';

const DURATION = 700;
const STEPS = 10;

/** Lớp phủ đặt trong VoucherCard (trên mặt trước). `go` = bắt đầu tan. */
export function RevealOverlay({ go, onDone }: { go: boolean; onDone: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  // vẽ voucher trắng vào canvas đúng kích thước gốc (CSS phóng lên theo --px, pixelated)
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.current?.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, VOUCHER.w, VOUCHER.h);
      ctx.drawImage(img, 0, 0);
      setReady(true);
    };
    img.src = commonImg('voucherBlank');
  }, [go === false]);

  useEffect(() => {
    if (!go || !ready) return;
    const ctx = canvas.current!.getContext('2d')!;
    const n = VOUCHER.w * VOUCHER.h;
    // xáo trộn thứ tự pixel
    const order = new Uint32Array(n);
    for (let i = 0; i < n; i++) order[i] = i;
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    let step = 0;
    const per = Math.ceil(n / STEPS);
    const timer = setInterval(() => {
      const end = Math.min(n, (step + 1) * per);
      for (let k = step * per; k < end; k++) {
        const p = order[k];
        ctx.clearRect(p % VOUCHER.w, Math.floor(p / VOUCHER.w), 1, 1);
      }
      step++;
      if (step >= STEPS) {
        clearInterval(timer);
        onDone();
      }
    }, DURATION / STEPS);
    return () => clearInterval(timer);
  }, [go, ready]);

  return (
    <div class="reveal-overlay" aria-hidden="true">
      <canvas ref={canvas} width={VOUCHER.w} height={VOUCHER.h} class="reveal-canvas" />
      {!go && (
        <img
          class="reveal-q blink"
          src={commonImg('revealQuestion')}
          alt=""
          style={{ width: u(16), height: u(16), left: u((VOUCHER.w - 16) / 2), top: u((VOUCHER.h - 16) / 2) }}
        />
      )}
    </div>
  );
}
