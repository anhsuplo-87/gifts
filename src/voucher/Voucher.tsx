// Tấm voucher pixel: các lớp parallax, mặt trước / mặt sau, lật, nghiêng, nhấp nhô.
//
// Hai kiểu chuyển động (chọn bằng ?fx=):
// - 'smooth' (mặc định, học từ harmonies + invitation): nghiêng 3D theo con trỏ / chạm-kéo, các lớp
//   trượt mượt; CHỈ resample trong lúc đang nghiêng hoặc đang lật — đứng yên thì thẻ phẳng và nằm
//   đúng pixel. Lật 3D rotateY, bấm thẻ thì "bong bóng".
// - 'pixel' (bản cũ, SPEC §4 ban đầu): lật 2D scaleX theo bước, lớp dịch làm tròn theo pixel gốc.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { canPeel, type Item, type Voucher as VoucherData } from '../data/types.ts';
import { u } from '../ui/tokens.ts';
import { FRONT, LAYOUTS, MOTION, PARALLAX, VOUCHER, cellRect, layoutFor, maxCells, type Rect } from './layout.ts';
import { StickerImg } from './Sticker.tsx';

export type Face = 'front' | 'back';
export type Fx = 'smooth' | 'pixel';

export const readFx = (search = location.search): Fx => (new URLSearchParams(search).get('fx') === 'pixel' ? 'pixel' : 'smooth');

const box = (r: Rect) => ({ left: u(r.x), top: u(r.y), width: u(r.w), height: u(r.h) });
const DEPTHS = [PARALLAX.deco, PARALLAX.content, PARALLAX.shine];

/** Lớp trượt theo độ sâu d (pixel gốc); giá trị --sx{d}/--sy{d} do useLean ghi lên stage */
const layerStyle = (d: number) =>
  d ? { transform: `translate(calc(var(--sx${d}, 0) * var(--px)), calc(var(--sy${d}, 0) * var(--px)))` } : undefined;

/**
 * Nghiêng theo con trỏ (thiết bị có hover) hoặc chạm-kéo (cảm ứng). Ghi CSS custom properties thẳng
 * lên stage mỗi khung hình — không render lại Preact.
 *   --tiltx/--tilty: góc nghiêng (chỉ 'smooth');  --sx{d}/--sy{d}: độ dịch lớp theo pixel gốc
 *   ('pixel' làm tròn → luôn đúng lưới; 'smooth' để số lẻ, chỉ trong lúc đang nghiêng).
 */
function useLean(enabled: boolean, fx: Fx) {
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const moved = useRef(false);
  const frame = useRef<number | null>(null);
  const want = useRef<[number, number] | null>(null);

  const write = () => {
    frame.current = null;
    const el = stage.current;
    const w = want.current;
    if (!el || !w) return;
    const [ax, ay] = w; // -0.5 … 0.5
    el.classList.add('tilting');
    if (fx === 'smooth') {
      // góc tối đa ở góc thẻ: phân số 0.5 × 2 = 1
      el.style.setProperty('--tilty', `${(ax * MOTION.tiltDeg * 2).toFixed(2)}deg`);
      el.style.setProperty('--tiltx', `${(-ay * MOTION.tiltDeg * 2).toFixed(2)}deg`);
    }
    for (const d of DEPTHS) {
      const sx = ax * 2 * d;
      const sy = ay * 2 * d;
      el.style.setProperty(`--sx${d}`, fx === 'pixel' ? String(Math.round(sx)) : sx.toFixed(3));
      el.style.setProperty(`--sy${d}`, fx === 'pixel' ? String(Math.round(sy)) : sy.toFixed(3));
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
    if (!el) return;
    el.classList.remove('tilting');
    for (const p of ['--tiltx', '--tilty', ...DEPTHS.flatMap((d) => [`--sx${d}`, `--sy${d}`])]) el.style.removeProperty(p);
  };

  useEffect(() => {
    if (!enabled) flat();
  }, [enabled]);

  const handlers = {
    onPointerMove: (e: PointerEvent) => {
      if (!enabled) return;
      const el = stage.current!;
      if (e.pointerType === 'mouse') {
        // thẻ nghe con trỏ, khối bên trong mới xoay → mép thẻ không trượt khỏi con trỏ (B-007 harmonies)
        const r = el.getBoundingClientRect();
        set((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
      } else if (drag.current && drag.current.id === e.pointerId) {
        const dx = e.clientX - drag.current.x;
        const dy = e.clientY - drag.current.y;
        if (Math.abs(dx) + Math.abs(dy) > 6) drag.current.moved = true;
        set((dx / MOTION.dragRangePx) * 0.5, (dy / MOTION.dragRangePx) * 0.5);
      }
    },
    onPointerDown: (e: PointerEvent) => {
      moved.current = false;
      if (enabled && e.pointerType !== 'mouse') {
        drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      }
    },
    onPointerUp: (e: PointerEvent) => {
      if (drag.current && drag.current.id === e.pointerId) {
        moved.current = drag.current.moved;
        drag.current = null;
        flat();
      }
    },
    onPointerCancel: () => {
      drag.current = null;
      flat();
    },
    onPointerLeave: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') flat();
    },
  };
  /** true nếu cú chạm vừa rồi là kéo-nghiêng (không tính là bấm) */
  const consumeDrag = () => {
    const v = moved.current;
    moved.current = false;
    return v;
  };
  return { stage, handlers, consumeDrag };
}

export type VoucherProps = {
  voucher: VoucherData;
  items: Item[];
  face: Face;
  fx: Fx;
  /** Chỉ dùng ở fx='pixel': đang lật 2D ('out' = bóp lại, 'in' = mở ra) */
  flipPhase?: 'out' | 'in' | null;
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
  const { voucher, items, face, fx, reducedMotion, focus, poppedId } = props;
  const theme = voucher.theme;
  const motion = !reducedMotion;
  const { stage, handlers, consumeDrag } = useLean(motion && !focus, fx);
  const kind = layoutFor(voucher.slots);
  const L = LAYOUTS[kind];
  const slots = Math.min(voucher.slots, maxCells(kind));
  const bySlot = new Map(items.filter((i) => i.used && i.slot !== null).map((i) => [i.slot!, i]));
  const usedCount = items.filter((i) => i.used).length;

  // Lật 3D (smooth): đánh dấu "đang lật" trong lúc quay để được resample mượt
  const [flipping, setFlipping] = useState(false);
  const firstFace = useRef(face);
  useEffect(() => {
    if (fx !== 'smooth' || !motion || face === firstFace.current) return;
    firstFace.current = face;
    setFlipping(true);
    const t = setTimeout(() => setFlipping(false), MOTION.flipMs);
    return () => clearTimeout(t);
  }, [face]);

  // Nhấn → co lại, thả → "bong bóng" (smooth, không áp dụng khi đang tập trung)
  const bubble = useRef<HTMLDivElement>(null);
  const press = (on: boolean) => {
    const el = bubble.current;
    if (!el || fx !== 'smooth' || !motion || focus) return;
    if (on) {
      el.classList.remove('bubble');
      el.classList.add('pressed');
    } else if (el.classList.contains('pressed')) {
      el.classList.remove('pressed');
      void el.offsetWidth; // chạy lại animation
      el.classList.add('bubble');
    }
  };

  const onClick = () => {
    if (consumeDrag()) return;
    props.onTap();
  };

  const showFace = (f: Face) => fx === 'smooth' || f === face;

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
                if (consumeDrag()) return;
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

  const pixelFlip = fx === 'pixel' && props.flipPhase ? ` flip-${props.flipPhase}` : '';
  return (
    <div
      ref={stage}
      class={`voucher-stage fx-${fx}${motion && !focus ? ' idle' : ''}${focus ? ' is-focus' : ''}${flipping ? ' flipping' : ''}`}
      style={{ width: u(VOUCHER.w), height: u(VOUCHER.h), '--flip-ms': `${MOTION.flipMs}ms`, '--settle-ms': `${MOTION.settleMs}ms`, '--bubble-ms': `${MOTION.bubbleMs}ms`, '--persp': `${MOTION.perspectivePx}px` }}
      {...handlers}
      onPointerDown={(e) => {
        handlers.onPointerDown(e);
        press(true);
      }}
      onPointerUp={(e) => {
        handlers.onPointerUp(e);
        press(false);
      }}
      onPointerLeave={(e) => {
        handlers.onPointerLeave(e);
        bubble.current?.classList.remove('pressed');
      }}
      onClick={onClick}
    >
      <div class="vshadow" aria-hidden="true" style={{ backgroundImage: `var(--img-voucher-${face === 'front' ? 'front' : 'back'})` }} />
      <div class="voucher-bubble" ref={bubble} onAnimationEnd={() => bubble.current?.classList.remove('bubble')}>
        <div class="voucher-lean">
          <div class={`voucher${pixelFlip}`} data-face={face}>
            {showFace('front') && frontFace}
            {showFace('back') && backFace}
          </div>
        </div>
      </div>
    </div>
  );
}
