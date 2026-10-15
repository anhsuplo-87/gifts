// Tấm voucher pixel: các lớp parallax, mặt trước / mặt sau, lật 3D, nghiêng 3D, nhấp nhô (SPEC §4).
// Nguyên tắc: chỉ biến dạng khi ĐANG nghiêng / lật; đứng yên thì không còn transform 3D nào → mọi chữ,
// ô, sticker nằm đúng lưới pixel. Ảnh luôn phóng kiểu pixel trước rồi cả lớp mới xoay.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { canPeel, type Item, type Voucher as VoucherData } from '../data/types.ts';
import { u } from '../ui/tokens.ts';
import { FRONT, LAYOUTS, MOTION, PARALLAX, VOUCHER, cellRect, layoutFor, maxCells, type Rect } from './layout.ts';
import { StickerImg } from './Sticker.tsx';
import { isTouchOnly, onTiltState, tiltState } from './tilt.ts';

export type Face = 'front' | 'back';

const box = (r: Rect) => ({ left: u(r.x), top: u(r.y), width: u(r.w), height: u(r.h) });
const DEPTHS = [PARALLAX.deco, PARALLAX.content, PARALLAX.shine];

/** Lớp trượt theo độ sâu d (pixel gốc); --sx{d}/--sy{d} do useLean ghi lên stage */
const layerStyle = (d: number) =>
  d ? { transform: `translate(calc(var(--sx${d}, 0) * var(--px)), calc(var(--sy${d}, 0) * var(--px)))` } : undefined;

/** Trục ngang/dọc của máy theo hướng màn hình (độ): x = nghiêng trái-phải, y = nghiêng trước-sau */
function screenAxes(beta: number, gamma: number): [number, number] {
  const angle = (screen.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0) as number;
  switch ((angle + 360) % 360) {
    case 90:
      return [beta, -gamma];
    case 270:
      return [-beta, gamma];
    case 180:
      return [-gamma, -beta];
    default:
      return [gamma, beta];
  }
}

/**
 * Nghiêng: theo con trỏ (desktop, có hover) hoặc theo độ nghiêng máy (cảm ứng). Ghi CSS custom
 * properties thẳng lên stage mỗi khung hình — không render lại Preact.
 */
function useLean(enabled: boolean) {
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const want = useRef<[number, number] | null>(null);

  const write = () => {
    frame.current = null;
    const el = stage.current;
    const w = want.current;
    if (!el || !w) return;
    const [ax, ay] = w; // -0.5 … 0.5; góc tối đa ở góc thẻ (0.5 × 2 = 1)
    el.classList.add('tilting');
    el.style.setProperty('--tilty', `${(ax * MOTION.tiltDeg * 2).toFixed(2)}deg`);
    el.style.setProperty('--tiltx', `${(-ay * MOTION.tiltDeg * 2).toFixed(2)}deg`);
    for (const d of DEPTHS) {
      el.style.setProperty(`--sx${d}`, (ax * 2 * d).toFixed(3));
      el.style.setProperty(`--sy${d}`, (ay * 2 * d).toFixed(3));
    }
  };
  const set = (ax: number, ay: number) => {
    const c = (v: number) => Math.max(-0.5, Math.min(0.5, v));
    want.current = [c(ax), c(ay)];
    if (frame.current === null) frame.current = requestAnimationFrame(write);
  };
  const flat = () => {
    const el = stage.current;
    want.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    if (!el || !el.classList.contains('tilting')) return;
    el.classList.remove('tilting');
    for (const p of ['--tiltx', '--tilty', ...DEPTHS.flatMap((d) => [`--sx${d}`, `--sy${d}`])]) el.style.removeProperty(p);
  };

  // ── Con quay (cảm ứng) ──
  const [tilt, setTilt] = useState(tiltState());
  useEffect(() => onTiltState(setTilt), []);
  useEffect(() => {
    if (!enabled || tilt !== 'granted' || !isTouchOnly()) {
      flat();
      return;
    }
    let base: [number, number] | null = null;
    let sm: [number, number] = [0, 0];
    let last = performance.now();
    let stillSince = last;
    let smallSince = last;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (document.hidden || e.beta === null || e.gamma === null) return;
      const [x, y] = screenAxes(e.beta, e.gamma);
      const now = performance.now();
      const dt = Math.min(0.5, (now - last) / 1000);
      last = now;
      if (!base) {
        base = [x, y];
        sm = [x, y];
        return;
      }
      // làm mượt tín hiệu, rồi cho tư thế gốc trôi theo (cầm yên → độ lệch về 0)
      const prev = sm;
      const a = 1 - Math.exp(-dt / MOTION.gyroSmoothS);
      sm = [sm[0] + (x - sm[0]) * a, sm[1] + (y - sm[1]) * a];
      const b = 1 - Math.exp(-dt / MOTION.gyroBaseS);
      base = [base[0] + (sm[0] - base[0]) * b, base[1] + (sm[1] - base[1]) * b];
      const dx = sm[0] - base[0];
      const dy = sm[1] - base[1];
      // Hai cách "yên", mỗi cách một đồng hồ:
      //  - máy gần như không chuyển động đủ lâu → tư thế gốc bắt kịp ngay, về phẳng;
      //  - độ lệch nhỏ đủ lâu → về phẳng.
      // Đang phẳng thì lệch nhỏ không đủ để nghiêng lại (tránh bật/tắt liên tục).
      const speed = dt > 0 ? Math.max(Math.abs(sm[0] - prev[0]), Math.abs(sm[1] - prev[1])) / dt : 0;
      const small = Math.max(Math.abs(dx), Math.abs(dy)) < MOTION.gyroQuietDeg;
      if (speed >= MOTION.gyroStillDegPerS) stillSince = now;
      if (!small) smallSince = now;
      if (now - stillSince > MOTION.gyroQuietMs) {
        base = [sm[0], sm[1]];
        return flat();
      }
      if (now - smallSince > MOTION.gyroQuietMs) return flat();
      if (small && !stage.current?.classList.contains('tilting')) return;
      set((dx / MOTION.gyroRangeDeg) * 0.5, (dy / MOTION.gyroRangeDeg) * 0.5);
    };
    const onHidden = () => document.hidden && flat();
    window.addEventListener('deviceorientation', onOrient);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('deviceorientation', onOrient);
      document.removeEventListener('visibilitychange', onHidden);
      flat();
    };
  }, [enabled, tilt]);

  useEffect(() => {
    if (!enabled) flat();
  }, [enabled]);

  // ── Con trỏ (desktop). Cảm ứng / bút: không nghiêng bằng chạm-kéo ──
  const handlers = {
    onPointerMove: (e: PointerEvent) => {
      if (!enabled || e.pointerType !== 'mouse') return;
      // thẻ nghe con trỏ, khối bên trong mới xoay → mép thẻ không trượt khỏi con trỏ
      const r = stage.current!.getBoundingClientRect();
      set((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
    },
    onPointerLeave: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') flat();
    },
  };
  return { stage, handlers };
}

export type VoucherProps = {
  voucher: VoucherData;
  items: Item[];
  face: Face;
  reducedMotion: boolean;
  /** Chế độ tập trung (đang chọn sticker): thẻ đứng yên, phẳng, đúng pixel; ô trống nhấp nháy */
  focus: boolean;
  /** id sticker vừa dán (chạy hiệu ứng) */
  poppedId: string | null;
  onTap: () => void;
  onCell: (slot: number) => void;
  onStuck: (item: Item) => void;
  /** Lớp phủ trên mặt trước (màn tiết lộ) */
  overlay?: ComponentChildren;
};

export function VoucherCard(props: VoucherProps) {
  const { voucher, items, face, reducedMotion, focus, poppedId } = props;
  const theme = voucher.theme;
  const motion = !reducedMotion;
  const { stage, handlers } = useLean(motion && !focus);
  const kind = layoutFor(voucher.slots);
  const L = LAYOUTS[kind];
  const slots = Math.min(voucher.slots, maxCells(kind));
  const bySlot = new Map(items.filter((i) => i.used && i.slot !== null).map((i) => [i.slot!, i]));
  const usedCount = items.filter((i) => i.used).length;

  // Lật 3D: đánh dấu "đang lật" trong lúc quay
  const [flipping, setFlipping] = useState(false);
  const firstFace = useRef(face);
  useEffect(() => {
    if (!motion || face === firstFace.current) return;
    firstFace.current = face;
    setFlipping(true);
    const t = setTimeout(() => setFlipping(false), MOTION.flipMs);
    return () => clearTimeout(t);
  }, [face]);

  // Nhấn → co lại, thả → "bong bóng" (không áp dụng khi đang tập trung)
  const bubble = useRef<HTMLDivElement>(null);
  const press = (on: boolean) => {
    const el = bubble.current;
    if (!el || !motion || focus) return;
    if (on) {
      el.classList.remove('bubble');
      el.classList.add('pressed');
    } else if (el.classList.contains('pressed')) {
      el.classList.remove('pressed');
      void el.offsetWidth; // chạy lại animation
      el.classList.add('bubble');
    }
  };

  const frontFace = (
    <div class="vface vface--front" aria-hidden={face !== 'front'}>
      <div class="vlayer" style={{ backgroundImage: 'var(--img-voucher-front)' }} />
      <div class="vlayer" style={{ backgroundImage: 'var(--img-voucher-front-deco)', ...layerStyle(PARALLAX.deco) }} />
      <div class="vcontent" style={layerStyle(PARALLAX.content)}>
        <p class="pt vtext vtext--title" style={box(FRONT.title)}>
          {voucher.title}
        </p>
        <p class="pt vtext" style={box(FRONT.recipient)}>
          {voucher.recipientName}
        </p>
        <p class="pt vtext vtext--muted" style={box(FRONT.giver)}>
          từ {voucher.giverName}
        </p>
      </div>
      {props.overlay}
      <div class="vlayer vshine" style={{ backgroundImage: 'var(--img-voucher-shine)', ...layerStyle(PARALLAX.shine) }} />
    </div>
  );

  const backFace = (
    <div class="vface vface--back" aria-hidden={face !== 'back'}>
      <div class="vlayer" style={{ backgroundImage: 'var(--img-voucher-back)' }} />
      <div class="vcontent" style={layerStyle(PARALLAX.content)}>
        <p class="pt vtext" style={box(L.header)}>
          {kind === 'single' ? (usedCount ? 'Đã chọn 1 món' : 'Chọn 1 món') : `Đã dán ${usedCount}/${voucher.slots}`}
        </p>
        {Array.from({ length: slots }, (_, slot) => {
          const r = cellRect(kind, slot);
          const it = bySlot.get(slot);
          const label = it
            ? `Ô ${slot + 1}: ${it.title}, đã dán${canPeel(it) ? ', còn bóc ra được' : ''}`
            : focus
              ? `Ô ${slot + 1}, trống — bấm để dán vào đây`
              : `Ô ${slot + 1}, trống`;
          return (
            <button
              key={slot}
              type="button"
              class={`cell${it ? ' cell--filled' : ''}${focus && !it ? ' cell--target' : ''}${it && it.id === poppedId ? ' cell--shake' : ''}`}
              style={{ ...box(r), backgroundImage: kind === 'single' ? 'var(--img-slot-big)' : 'var(--img-slot-empty)' }}
              aria-label={label}
              tabIndex={face === 'back' ? 0 : -1}
              onClick={(e) => {
                e.stopPropagation();
                it ? props.onStuck(it) : props.onCell(slot);
              }}
            >
              {it && (
                <span class={it.id === poppedId ? 'pop' : undefined}>
                  <StickerImg item={it} theme={theme} kind={kind} box={L.cell} unit="u" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div class="vlayer vshine" style={{ backgroundImage: 'var(--img-voucher-shine)', ...layerStyle(PARALLAX.shine) }} />
    </div>
  );

  return (
    <div
      ref={stage}
      class={`voucher-stage${motion && !focus ? ' idle' : ''}${focus ? ' is-focus' : ''}${flipping ? ' flipping' : ''}`}
      style={{
        width: u(VOUCHER.w),
        height: u(VOUCHER.h),
        '--flip-ms': `${MOTION.flipMs}ms`,
        '--settle-ms': `${MOTION.settleMs}ms`,
        '--bubble-ms': `${MOTION.bubbleMs}ms`,
        '--persp': `${MOTION.perspectivePx}px`,
      }}
      onPointerMove={handlers.onPointerMove}
      onPointerDown={() => press(true)}
      onPointerUp={() => press(false)}
      onPointerCancel={() => bubble.current?.classList.remove('pressed')}
      onPointerLeave={(e) => {
        handlers.onPointerLeave(e);
        bubble.current?.classList.remove('pressed');
      }}
      onClick={props.onTap}
    >
      <div class="vshadow" aria-hidden="true" style={{ backgroundImage: `var(--img-voucher-${face === 'front' ? 'front' : 'back'})` }} />
      <div class="voucher-bubble" ref={bubble} onAnimationEnd={() => bubble.current?.classList.remove('bubble')}>
        <div class="voucher-lean">
          <div class="voucher" data-face={face}>
            {frontFace}
            {backFace}
          </div>
        </div>
      </div>
    </div>
  );
}
