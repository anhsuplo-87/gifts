// Đưa manifest asset + bảng màu thành CSS custom properties (một nguồn sự thật):
//   :root               --img-frame-dialog: url(…); --slice-frame-dialog: 8; …
//   [data-theme=gamer]  --c-paper: …; --img-voucher-front: url(…); …
import { ASSET_ROOT, COMMON_ASSETS, THEME_ASSETS, themeDir } from '../voucher/assets.ts';
import { THEME_IDS, themeTokensCss } from '../voucher/themes.ts';

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export function buildTokenCss(): string {
  const root = Object.entries(COMMON_ASSETS)
    .map(([k, a]) => {
      const slice = 'slice' in a ? `--slice-${kebab(k)}:${a.slice};` : '';
      return `--img-${kebab(k)}:url("${assetUrl(`${ASSET_ROOT}/${a.file}`)}");${slice}`;
    })
    .join('');
  const themes = THEME_IDS.map((t) => {
    const vars = Object.entries(THEME_ASSETS)
      .map(([k, a]) => `--img-${kebab(k)}:url("${assetUrl(`${themeDir(t)}/${a.file}`)}");`)
      .join('');
    return `[data-theme="${t}"]{${vars}}`;
  }).join('\n');
  return `:root{${root}}\n${themeTokensCss()}\n${themes}`;
}

export function injectTokens() {
  const el = document.createElement('style');
  el.id = 'tokens';
  el.textContent = buildTokenCss();
  document.head.prepend(el);
}

/** Đường dẫn ảnh theo theme / dùng chung (cho <img>) */
export const themeImg = (theme: string, key: keyof typeof THEME_ASSETS) => assetUrl(`${ASSET_ROOT}/themes/${theme}/${THEME_ASSETS[key].file}`);
export const commonImg = (key: keyof typeof COMMON_ASSETS) => assetUrl(`${ASSET_ROOT}/${COMMON_ASSETS[key].file}`);

/** n pixel gốc → độ dài CSS (bội số của --px) */
export const u = (n: number) => `calc(${n} * var(--px))`;
