// Bảng màu theo theme. Dùng chung cho CSS tokens (injectThemeTokens) và scripts/gen-placeholders.mjs.

export const THEME_IDS = ['designer', 'gamer'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export type Palette = {
  bg: string; // nền trang
  bg2: string; // hoạ tiết nền trang
  paper: string; // mặt voucher
  paper2: string; // mảng phụ trên voucher
  ink: string; // chữ chính
  muted: string; // chữ phụ
  accent: string; // màu nhấn 1
  accent2: string; // màu nhấn 2
  pop: string; // điểm sáng
  line: string; // viền nhạt
  shadow: string; // bóng
};

export const PALETTES: Record<ThemeId, Palette> = {
  // kem + san hô + xanh mòng két
  designer: {
    bg: '#f6efdc',
    bg2: '#efe4c8',
    paper: '#fffaf0',
    paper2: '#ffe9dc',
    ink: '#3a2e2a',
    muted: '#76665b',
    accent: '#ff6f59',
    accent2: '#1b998b',
    pop: '#ffc94d',
    line: '#e2d3b2',
    shadow: '#c7b089',
  },
  // xanh than + tím + điểm neon
  gamer: {
    bg: '#141b33',
    bg2: '#18213f',
    paper: '#232c50',
    paper2: '#2d3866',
    ink: '#eef1ff',
    muted: '#aab3dd',
    accent: '#9b6bff',
    accent2: '#39f08a',
    pop: '#3de8ff',
    line: '#3a4878',
    shadow: '#080c1c',
  },
};

/** Màu cho hình dùng chung (hộp thoại, nút, icon) — trung tính, hợp cả hai theme */
export const COMMON = {
  white: '#ffffff',
  paper: '#fffaf0',
  ink: '#2b2233',
  muted: '#8a7f8f',
  accent: '#ff6f59',
  accentDark: '#c94a39',
  accent2: '#1b998b',
  pop: '#ffc94d',
  line: '#d8ccb6',
  shadow: '#00000040',
} as const;

/** Sinh CSS custom properties `[data-theme=…] { --c-bg: … }` từ PALETTES */
export function themeTokensCss(): string {
  return THEME_IDS.map((id) => {
    const vars = Object.entries(PALETTES[id])
      .map(([k, v]) => `--c-${k}:${v};`)
      .join('');
    return `[data-theme="${id}"]{${vars}}`;
  }).join('\n');
}
