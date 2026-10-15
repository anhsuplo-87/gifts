// Manifest hình UI (docs/ASSETS.md) — MỘT nguồn cho scripts/gen-placeholders.mjs,
// scripts/check-assets.mjs và code UI. Kích thước lấy từ layout.ts.
import { LAYOUTS, VOUCHER } from './layout.ts';
import { THEME_IDS, type ThemeId } from './themes.ts';

export type AssetDef = {
  /** Đường dẫn trong public/assets/ui/ (asset theo theme: tương đối với themes/<theme>/) */
  file: string;
  w: number;
  h: number;
  /** 9-slice: số pixel góc giữ nguyên */
  slice?: number;
  /** ★ = Bá Lương vẽ trước */
  star?: boolean;
  /** Kiểu hình placeholder, gen-placeholders.mjs dựa vào đây để vẽ */
  kind: string;
};

const V = { w: VOUCHER.w, h: VOUCHER.h };
const M = LAYOUTS.multi;
const S = LAYOUTS.single;

export const THEME_ASSETS = {
  voucherFront: { file: 'voucher-front.png', ...V, star: true, kind: 'voucher-front' },
  voucherFrontDeco: { file: 'voucher-front-deco.png', ...V, kind: 'voucher-deco' },
  voucherBack: { file: 'voucher-back.png', ...V, star: true, kind: 'voucher-back' },
  slotEmpty: { file: 'slot-empty.png', w: M.cell, h: M.cell, star: true, kind: 'slot' },
  slotBig: { file: 'slot-big.png', w: S.cell, h: S.cell, star: true, kind: 'slot' },
  sticker: { file: 'placeholder-sticker.png', w: M.sticker, h: M.sticker, kind: 'sticker' },
  stickerBig: { file: 'placeholder-sticker-big.png', w: S.sticker, h: S.sticker, kind: 'sticker' },
  bgTile: { file: 'bg-tile.png', w: 32, h: 32, kind: 'bg-tile' },
} as const satisfies Record<string, AssetDef>;

export const COMMON_ASSETS = {
  voucherBlank: { file: 'voucher-blank.png', ...V, star: true, kind: 'voucher-blank' },
  revealQuestion: { file: 'reveal-question.png', w: 16, h: 16, star: true, kind: 'icon:question' },
  voucherShine: { file: 'voucher-shine.png', ...V, kind: 'voucher-shine' },
  // UI chrome (003b): vẽ 1:1 — 1 pixel ảnh = 1px CSS, viền pixel 2px
  frameDialog: { file: 'frame-dialog.png', w: 8, h: 8, slice: 3, kind: 'frame-dialog' },
  frameTray: { file: 'frame-tray.png', w: 6, h: 6, slice: 2, kind: 'frame-tray' },
  btnPrimary: { file: 'btn-primary.png', w: 6, h: 6, slice: 2, kind: 'btn:primary' },
  btnPrimaryPressed: { file: 'btn-primary-pressed.png', w: 6, h: 6, slice: 2, kind: 'btn:pressed' },
  btnSecondary: { file: 'btn-secondary.png', w: 6, h: 6, slice: 2, kind: 'btn:secondary' },
  iconFlip: { file: 'icon-flip.png', w: 16, h: 16, kind: 'icon:flip' },
  iconLogin: { file: 'icon-login.png', w: 16, h: 16, kind: 'icon:login' },
  iconLogout: { file: 'icon-logout.png', w: 16, h: 16, kind: 'icon:logout' },
  iconPeel: { file: 'icon-peel.png', w: 16, h: 16, kind: 'icon:peel' },
  iconCheck: { file: 'icon-check.png', w: 16, h: 16, kind: 'icon:check' },
  iconClose: { file: 'icon-close.png', w: 16, h: 16, kind: 'icon:close' },
  iconScroll: { file: 'icon-scroll.png', w: 16, h: 16, kind: 'icon:scroll' },
  mascotEmpty: { file: 'mascot-empty.png', w: 32, h: 32, kind: 'mascot-empty' },
  mascotError: { file: 'mascot-error.png', w: 32, h: 32, kind: 'mascot-error' },
  browserWarning: { file: 'browser-warning.png', w: 32, h: 32, kind: 'browser-warning' },
  favicon: { file: 'favicon.png', w: 32, h: 32, kind: 'gift' },
  appIcon: { file: 'app-icon.png', w: 36, h: 36, kind: 'gift' },
} as const satisfies Record<string, AssetDef>;

export type ThemeAssetKey = keyof typeof THEME_ASSETS;
export type CommonAssetKey = keyof typeof COMMON_ASSETS;

/** Thư mục asset tính từ public/ */
export const ASSET_ROOT = 'assets/ui';
export const themeDir = (theme: ThemeId) => `${ASSET_ROOT}/themes/${theme}`;

/** Toàn bộ file cần có, đường dẫn tính từ public/ — dùng cho scripts */
export function allAssetFiles(): Array<AssetDef & { path: string; theme?: ThemeId }> {
  const list: Array<AssetDef & { path: string; theme?: ThemeId }> = [];
  for (const def of Object.values(COMMON_ASSETS)) list.push({ ...def, path: `${ASSET_ROOT}/${def.file}` });
  for (const theme of THEME_IDS) {
    for (const def of Object.values(THEME_ASSETS)) list.push({ ...def, path: `${themeDir(theme)}/${def.file}`, theme });
  }
  return list;
}
