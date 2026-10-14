// Kiểm tra font: liệt kê chữ tiếng Việt có dấu bị thiếu glyph, và tìm cỡ gốc của font pixel.
// Chạy: node scripts/check-font-glyphs.mjs           → in bảng
//       node scripts/check-font-glyphs.mjs --write   → in bảng + ghi src/fonts/font-metrics.json
import { readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fontkit from 'fontkit';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// 67 chữ thường có dấu + 67 chữ hoa = 134
const BASES = {
  a: 'àáảãạăằắẳẵặâầấẩẫậ',
  e: 'èéẻẽẹêềếểễệ',
  i: 'ìíỉĩị',
  o: 'òóỏõọôồốổỗộơờớởỡợ',
  u: 'ùúủũụưừứửữự',
  y: 'ỳýỷỹỵ',
  d: 'đ',
};
const LOWER = Object.values(BASES).join('');
export const VI_CHARS = [...LOWER, ...LOWER.toUpperCase()];
if (VI_CHARS.length !== 134) throw new Error(`Bộ chữ tiếng Việt sai: ${VI_CHARS.length}`);

// Nguồn font: file trong public/fonts + các gói @fontsource (gộp mọi subset của weight 400)
function sources() {
  const list = [];
  const pub = join(root, 'public/fonts');
  if (existsSync(pub)) {
    for (const f of readdirSync(pub).sort()) {
      if (/\.(ttf|otf|woff2?)$/i.test(f)) {
        list.push({ name: basename(f, extname(f)), files: [join(pub, f)], pixel: true });
      }
    }
  }
  const fs = [
    ['Pixelify Sans', 'pixelify-sans', true],
    ['Geist Pixel', 'geist-pixel', true],
    ['Nunito', 'nunito', false],
    ['Inter', 'inter', false],
  ];
  for (const [name, pkg, pixel] of fs) {
    const dir = join(root, 'node_modules/@fontsource', pkg, 'files');
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('-400-normal.woff2'))
      .map((f) => join(dir, f));
    list.push({ name, files, pixel });
  }
  return list;
}

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

// Cỡ gốc = unitsPerEm / (UCLN mọi toạ độ của đường viền glyph) → 1 pixel thiết kế = 1px CSS
function pixelBase(font) {
  let g = 0;
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    const glyph = font.glyphForCodePoint(ch.codePointAt(0));
    if (!glyph || glyph.id === 0) continue;
    for (const cmd of glyph.path.commands) {
      for (const v of cmd.args) {
        const n = Math.abs(Math.round(v));
        if (n !== 0) g = gcd(g, n);
      }
    }
  }
  // Font vẽ đúng lưới: UCLN = 1 pixel. Font không đúng lưới (UCLN quá nhỏ): lấy cạnh của dấu chấm "."
  if (g && font.unitsPerEm / g <= 64) return { unit: g, basePx: font.unitsPerEm / g, exact: true };
  const dot = font.glyphForCodePoint(0x2e).path.bbox;
  const unit = Math.min(dot.maxX - dot.minX, dot.maxY - dot.minY);
  if (!unit) return null;
  return { unit, basePx: +(font.unitsPerEm / unit).toFixed(3), exact: false };
}

const report = [];
for (const src of sources()) {
  const fonts = src.files.map((f) => fontkit.openSync(f));
  const missing = VI_CHARS.filter((ch) => !fonts.some((f) => f.hasGlyphForCodePoint(ch.codePointAt(0))));
  // Font gốc (file subset latin) dùng để đo cỡ gốc
  const main = fonts.find((f, i) => /-latin-400/.test(src.files[i])) ?? fonts[0];
  const base = src.pixel ? pixelBase(main) : null;
  report.push({
    name: src.name,
    family: main.familyName,
    unitsPerEm: main.unitsPerEm,
    ascent: main.ascent,
    descent: main.descent,
    basePx: base?.basePx ?? null,
    exact: base?.exact ?? null,
    missing: missing.length,
    missingChars: missing.join(''),
  });
}

console.log('| Font | Cỡ gốc (px) | Thiếu / 134 | Ký tự thiếu |');
console.log('|---|---|---|---|');
for (const r of report) {
  const chars = r.missingChars.length > 40 ? r.missingChars.slice(0, 40) + '…' : r.missingChars || '—';
  console.log(`| ${r.name} | ${r.basePx ?? "—"}${r.exact === false ? " (xấp xỉ)" : ""} | ${r.missing} | ${chars} |`);
}

if (process.argv.includes('--write')) {
  const out = join(root, 'src/fonts/font-metrics.json');
  const data = Object.fromEntries(report.map((r) => [r.name, { basePx: r.basePx, exact: r.exact, missing: r.missingChars }]));
  writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
  console.log(`\nĐã ghi ${out}`);
}
