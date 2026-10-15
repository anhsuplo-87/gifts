// Ảnh sticker luôn hiển thị ở bội số nguyên (SPEC §7): ảnh nhỏ hơn ô vẫn sắc nét.
import { useState } from 'preact/hooks';
import type { Item } from '../data/types.ts';
import type { ThemeId } from './themes.ts';
import { themeImg } from '../ui/tokens.ts';
import type { LayoutKind } from './layout.ts';

/** Hue cố định theo id, để các sticker placeholder khác màu nhau */
export function hueOf(id: string): number {
  // FNV-1a rồi rải theo góc vàng (~137.5°) để các id gần nhau vẫn khác màu rõ
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return Math.round(((h >>> 0) % 1000) * 137.508) % 360;
}

/**
 * box: cạnh ô chứa, tính bằng đơn vị `unit` (CSS px nếu unit='px', pixel gốc nếu unit='u').
 * Ảnh có cạnh n: phóng k = floor(box / n) lần; ảnh to hơn ô thì thu 1/ceil(n / box).
 */
export function StickerImg({ item, theme, kind, box, unit }: { item: Item; theme: ThemeId; kind: LayoutKind; box: number; unit: 'px' | 'u' }) {
  const placeholder = !item.image;
  const src = item.image ?? themeImg(theme, kind === 'single' ? 'stickerBig' : 'sticker');
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  let style: Record<string, string> = { visibility: 'hidden' };
  let wrap: Record<string, string> = {};
  if (nat) {
    const side = Math.max(nat.w, nat.h);
    const k = side <= box ? Math.floor(box / side) : 1 / Math.ceil(side / box);
    const len = (n: number) => (unit === 'u' ? `calc(${n * k} * var(--px))` : `${n * k}px`);
    style = { width: len(nat.w), height: len(nat.h) };
    // --s = cỡ 1 pixel của ảnh, dùng cho viền trắng + bóng (filter trên .sticker)
    wrap = { '--s': unit === 'u' ? (k >= 1 ? `calc(${k} * var(--px))` : 'var(--px)') : `${Math.max(1, Math.round(k))}px` };
    if (unit === 'u') {
      // căn giữa ô bằng toạ độ nguyên pixel gốc (flex căn giữa có thể rơi vào nửa pixel)
      const dw = Math.floor((box - nat.w * k) / 2);
      const dh = Math.floor((box - nat.h * k) / 2);
      Object.assign(wrap, { position: 'absolute', left: `calc(${dw} * var(--px))`, top: `calc(${dh} * var(--px))` });
    }
  }
  if (placeholder) style.filter = `hue-rotate(${hueOf(item.id)}deg)`;
  return (
    <span class="sticker" style={wrap}>
      <img
        class="sticker__img"
        src={src}
        alt=""
        draggable={false}
        style={style}
        ref={(el) => {
          // ảnh đã có trong cache có thể xong trước khi gắn onLoad
          if (el && !nat && el.complete && el.naturalWidth) setNat({ w: el.naturalWidth, h: el.naturalHeight });
        }}
        onLoad={(e) => {
          const img = e.currentTarget as HTMLImageElement;
          setNat({ w: img.naturalWidth, h: img.naturalHeight });
        }}
      />
    </span>
  );
}
