// Tấm voucher pixel: các lớp parallax, mặt trước / mặt sau, lật 2D, nhấp nhô (SPEC §4).
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { canPeel, type Item, type Voucher as VoucherData } from '../data/types.ts';
import { u } from '../ui/tokens.ts';
import { FRONT, LAYOUTS, PARALLAX, VOUCHER, cellRect, layoutFor, maxCells, type Rect } from './layout.ts';
import { StickerImg } from './Sticker.tsx';

export type Face = 'front' | 'back';

const box = (r: Rect) => ({ left: u(r.x), top: u(r.y), width: u(r.w), height: u(r.h) });

/** Độ nghiêng parallax, mỗi trục trong [-1, 1] */
type Tilt = { x: number; y: number };

/** Dịch lớp theo độ nghiêng, làm tròn về số nguyên pixel gốc → luôn là bội số của --px */
const shift = (t: Tilt, max: number) => {
  const dx = Math.round(t.x * max);
  const dy = Math.round(t.y * max);
  return dx || dy ? { transform: `translate(${u(dx)}, ${u(dy)})` } : undefined;
};

/** Parallax: con trỏ (desktop, theo vị trí chuột) hoặc chạm-kéo (mobile, nhả ra thì về chỗ cũ) */
function useParallax(enabled: boolean) {
  const [tilt, setTilt] = useState<Tilt>({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setTilt({ x: 0, y: 0 });
      return;
    }
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const onMove = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      if (e.pointerType === 'mouse') {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        setTilt({ x: clamp((e.clientX - cx) / (window.innerWidth / 2)), y: clamp((e.clientY - cy) / (window.innerHeight / 2)) });
      } else if (drag.current && drag.current.id === e.pointerId) {
        const dx = e.clientX - drag.current.x;
        const dy = e.clientY - drag.current.y;
        if (Math.abs(dx) + Math.abs(dy) > 6) drag.current.moved = true;
        setTilt({ x: clamp(dx / 80), y: clamp(dy / 80) });
      }
    };
    const end = (e: PointerEvent) => {
      if (drag.current && drag.current.id === e.pointerId) {
        suppressClick.current = drag.current.moved;
        drag.current = null;
        setTilt({ x: 0, y: 0 });
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [enabled]);

  const onPointerDown = (e: PointerEvent) => {
    suppressClick.current = false;
    if (enabled && e.pointerType !== 'mouse') drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
  };
  /** true nếu cú chạm vừa rồi là kéo (không tính là bấm) */
  const consumeDrag = () => {
    const v = suppressClick.current;
    suppressClick.current = false;
    return v;
  };
  return { tilt, ref, onPointerDown, consumeDrag };
}

export type VoucherProps = {
  voucher: VoucherData;
  items: Item[];
  face: Face;
  /** Đang lật: 'out' = bóp lại, 'in' = mở ra */
  flipPhase: 'out' | 'in' | null;
  reducedMotion: boolean;
  /** Đang chọn sticker → các ô trống nhấp nháy, bấm ô để dán */
  picking: boolean;
  /** id sticker vừa dán (chạy hiệu ứng) */
  poppedId: string | null;
  onTap: () => void;
  onCell: (slot: number) => void;
  onStuck: (item: Item) => void;
  /** Lớp phủ trên mặt trước (màn tiết lộ) */
  overlay?: ComponentChildren;
  interactive?: boolean;
};

export function VoucherCard(props: VoucherProps) {
  const { voucher, items, face, flipPhase, reducedMotion, picking, poppedId, interactive = true } = props;
  const theme = voucher.theme;
  const { tilt, ref, onPointerDown, consumeDrag } = useParallax(!reducedMotion);
  const kind = layoutFor(voucher.slots);
  const L = LAYOUTS[kind];
  const slots = Math.min(voucher.slots, maxCells(kind));
  const bySlot = new Map(items.filter((i) => i.used && i.slot !== null).map((i) => [i.slot!, i]));
  const usedCount = items.filter((i) => i.used).length;

  const onClick = () => {
    if (consumeDrag()) return;
    props.onTap();
  };

  const front = (
    <div class="vface vface--front" style={shift(tilt, PARALLAX.content)}>
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
  );

  const back = (
    <div class="vface vface--back" style={shift(tilt, PARALLAX.content)}>
      <p class="pt vtext" style={box(L.header)}>
        {kind === 'single' ? (usedCount ? 'Đã chọn 1 món' : 'Chọn 1 món') : `Đã dán ${usedCount}/${voucher.slots}`}
      </p>
      {Array.from({ length: slots }, (_, slot) => {
        const r = cellRect(kind, slot);
        const it = bySlot.get(slot);
        const label = it
          ? `Ô ${slot + 1}: ${it.title}, đã dán${canPeel(it) ? ', còn bóc ra được' : ''}`
          : picking
            ? `Ô ${slot + 1}, trống — bấm để dán vào đây`
            : `Ô ${slot + 1}, trống`;
        return (
          <button
            key={slot}
            type="button"
            class={`cell${it ? ' cell--filled' : ''}${picking && !it ? ' cell--target' : ''}${it && it.id === poppedId ? ' cell--shake' : ''}`}
            style={{ ...box(r), backgroundImage: kind === 'single' ? 'var(--img-slot-big)' : 'var(--img-slot-empty)' }}
            aria-label={label}
            tabIndex={face === 'back' && interactive ? 0 : -1}
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
  );

  const flipClass = flipPhase === 'out' ? ' flip-out' : flipPhase === 'in' ? ' flip-in' : '';
  return (
    <div class={`voucher-stage${reducedMotion ? '' : ' idle'}`} style={{ width: u(VOUCHER.w), height: u(VOUCHER.h) }}>
      <div
        ref={ref}
        class={`voucher${flipClass}${picking ? ' voucher--picking' : ''}`}
        data-face={face}
        onPointerDown={onPointerDown}
        onClick={interactive ? onClick : undefined}
      >
        <div class="vlayer vshadow" aria-hidden="true" style={{ backgroundImage: `var(--img-voucher-${face === 'front' ? 'front' : 'back'})` }} />
        <div
          class="vlayer"
          aria-hidden="true"
          style={{ backgroundImage: `var(--img-voucher-${face === 'front' ? 'front' : 'back'})`, ...shift(tilt, PARALLAX.bg) }}
        />
        {face === 'front' && <div class="vlayer" aria-hidden="true" style={{ backgroundImage: 'var(--img-voucher-front-deco)', ...shift(tilt, PARALLAX.deco) }} />}
        {face === 'front' ? front : back}
        {props.overlay}
        <div class="vlayer" aria-hidden="true" style={{ backgroundImage: 'var(--img-voucher-shine)', ...shift(tilt, PARALLAX.shine) }} />
      </div>
    </div>
  );
}
