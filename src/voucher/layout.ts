// MỌI kích thước voucher / ô / sticker nằm ở đây (SPEC §7 — kích thước CHƯA CHỐT).
// Đơn vị: pixel gốc (1 pixel của hình vẽ). Trên màn hình, 1 pixel gốc = --px pixel CSS.
// Đổi số ở đây → chạy `npm run gen:placeholders -- --force` → `npm run build`.
// File này được cả code UI lẫn scripts/*.mjs import, nên chỉ chứa dữ liệu thuần.

export type Rect = { x: number; y: number; w: number; h: number };

/** Kích thước voucher */
export const VOUCHER = { w: 160, h: 90, inset: 6 } as const;

/** Font pixel dearpix-2-01: cỡ gốc 16px, một dòng cao 16 pixel gốc */
export const FONT = { family: 'dearpix-2-01', basePx: 16, lineHeight: 16 } as const;

/** Vùng chữ mặt trước */
export const FRONT = {
  title: { x: 6, y: 8, w: 148, h: 32 }, // tối đa 2 dòng
  recipient: { x: 6, y: 46, w: 148, h: 16 },
  giver: { x: 6, y: 66, w: 148, h: 16 },
} as const satisfies Record<string, Rect>;

/** Hai bố cục mặt sau: nhiều ô và một ô */
export const LAYOUTS = {
  multi: {
    header: { x: 6, y: 4, w: 148, h: 16 },
    cell: 26,
    sticker: 24,
    cols: 5,
    rows: 2,
    gap: 4,
    origin: { x: 7, y: 24 },
  },
  single: {
    header: { x: 6, y: 4, w: 148, h: 16 },
    cell: 56,
    sticker: 48,
    cols: 1,
    rows: 1,
    gap: 0,
    origin: { x: 52, y: 26 },
  },
} as const;

export type LayoutKind = keyof typeof LAYOUTS;
export const layoutFor = (slots: number): LayoutKind => (slots <= 1 ? 'single' : 'multi');

/** Toạ độ ô thứ i (0-based, đi theo hàng) */
export function cellRect(kind: LayoutKind, i: number): Rect {
  const L = LAYOUTS[kind];
  const col = i % L.cols;
  const row = Math.floor(i / L.cols);
  return { x: L.origin.x + col * (L.cell + L.gap), y: L.origin.y + row * (L.cell + L.gap), w: L.cell, h: L.cell };
}

/** Số ô tối đa mỗi bố cục vẽ được */
export const maxCells = (kind: LayoutKind) => LAYOUTS[kind].cols * LAYOUTS[kind].rows;

/** Kiểm tra các số trên còn khớp nhau (ô nằm trong voucher, sticker vừa ô, vùng chữ trong voucher) */
export function validateLayout(): string[] {
  const errs: string[] = [];
  const inside = (name: string, r: Rect) => {
    if (r.x < 0 || r.y < 0 || r.x + r.w > VOUCHER.w || r.y + r.h > VOUCHER.h)
      errs.push(`${name} (${r.x},${r.y} ${r.w}×${r.h}) tràn khỏi voucher ${VOUCHER.w}×${VOUCHER.h}`);
  };
  for (const [k, r] of Object.entries(FRONT)) inside(`FRONT.${k}`, r);
  for (const kind of Object.keys(LAYOUTS) as LayoutKind[]) {
    const L = LAYOUTS[kind];
    if (L.sticker > L.cell) errs.push(`${kind}: sticker ${L.sticker} lớn hơn ô ${L.cell}`);
    inside(`${kind}.header`, L.header);
    inside(`${kind} ô cuối`, cellRect(kind, maxCells(kind) - 1));
  }
  return errs;
}

/** Parallax: độ dịch tối đa (pixel gốc) của từng lớp */
export const PARALLAX = { bg: 0, deco: 1, content: 2, shine: 3 } as const;

/**
 * Chuyển động (SPEC §4, học từ harmonies + invitation):
 * - desktop: nghiêng 3D theo con trỏ, tối đa `tiltDeg` ở góc; thả ra về phẳng trong `settleMs`;
 * - điện thoại: nghiêng theo độ nghiêng máy — dùng ĐỘ LỆCH so với tư thế gốc, tư thế gốc trôi theo máy
 *   (hằng số `gyroBaseS`), nên cầm yên thì thẻ tự về phẳng; lệch dưới `gyroQuietDeg` trong `gyroQuietMs`
 *   thì bỏ hẳn transform;
 * - lật 3D `flipMs`, chạm thẻ thì "bong bóng" `bubbleMs`.
 */
export const MOTION = {
  tiltDeg: 9,
  perspectivePx: 620,
  settleMs: 120,
  flipMs: 700,
  bubbleMs: 420,
  /** Con quay: làm mượt tín hiệu (s), tư thế gốc trôi theo máy (s) */
  gyroSmoothS: 0.08,
  gyroBaseS: 0.8,
  /** Lệch bao nhiêu độ so với tư thế gốc thì đạt nghiêng tối đa */
  gyroRangeDeg: 12,
  /** Máy đứng yên (tốc độ < gyroStillDegPerS) trong gyroQuietMs → tư thế gốc bắt kịp, về phẳng, bỏ transform;
   *  độ lệch dưới gyroQuietDeg trong gyroQuietMs → về phẳng */
  gyroQuietDeg: 0.8,
  gyroStillDegPerS: 6,
  gyroQuietMs: 600,
} as const;

/** Sticker trong bảng: phóng nguyên lần sao cho cạnh ≥ 48px CSS (SPEC §8) */
export const TRAY_MIN_CSS = 48;

/**
 * Cỡ 1 pixel gốc trên màn hình (số nguyên, SPEC §7):
 * --px = clamp(2, floor((vw − 32) / 160), 4), khi xoay ngang còn bị giới hạn theo chiều cao.
 */
export const PX = { min: 2, max: 4, sideMargin: 32, landscapeReserveH: 120 } as const;
export function computePx(vw: number, vh: number): number {
  const byW = Math.floor((vw - PX.sideMargin) / VOUCHER.w);
  let px = byW;
  if (vw > vh) {
    // Xoay ngang: chừa chỗ cho header + bảng sticker
    const byH = Math.floor((vh - PX.landscapeReserveH) / VOUCHER.h);
    px = Math.min(px, byH);
  }
  return Math.max(PX.min, Math.min(PX.max, px));
}
