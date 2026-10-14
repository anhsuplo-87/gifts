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
    // Quét cả thư mục con (bỏ qua zip/); cùng tên có cả .ttf và .otf thì lấy .ttf
    const found = readdirSync(pub, { recursive: true })
      .map((f) => String(f).replace(/\\/g, '/'))
      .filter((f) => /\.(ttf|otf|woff2?)$/i.test(f) && !f.startsWith('zip/'))
      .sort((a, b) => a.localeCompare(b));
    const byName = new Map();
    for (const f of found) {
      const name = basename(f, extname(f));
      if (!byName.has(name) || /\.ttf$/i.test(f)) byName.set(name, f);
    }
    for (const [name, file] of byName) {
      list.push({ name, file, files: [join(pub, file)], pixel: true });
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

// Cỡ gốc = số pixel thiết kế trên 1 em → ở cỡ này 1 pixel thiết kế = 1px CSS.
// 1 pixel thiết kế = bước lưới LỚN NHẤT mà mọi toạ độ đường viền nằm sát bội số của nó
// (cho phép lệch nhỏ: toạ độ bị làm tròn, hoặc viền nới vài đơn vị để các ô dính nhau).
// Ứng viên bước lưới lấy từ khoảng cách giữa các toạ độ liên tiếp.
function pixelBase(font) {
  const upem = font.unitsPerEm;
  const coords = [];
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    const glyph = font.glyphForCodePoint(ch.codePointAt(0));
    if (!glyph || glyph.id === 0) continue;
    for (const cmd of glyph.path.commands) coords.push(...cmd.args);
  }
  const tol = Math.max(4, upem * 0.005);
  const uniq = [...new Set(coords.map(Math.round))].sort((a, b) => a - b);
  const candidates = new Set();
  for (let i = 1; i < uniq.length; i++) {
    const d = uniq[i] - uniq[i - 1];
    if (d >= upem / 64) candidates.add(d);
  }
  for (const step of [...candidates].sort((a, b) => b - a)) {
    if (coords.every((v) => Math.abs(v - Math.round(v / step) * step) <= tol)) {
      // Toạ độ bị làm tròn (vd 2000/9 = 222.2 → 222): bám về phân số /3 gần nhất nếu lệch < 0.5%
      let basePx = upem / step;
      const snapped = Math.round(basePx * 3) / 3;
      if (Math.abs(basePx - snapped) / snapped < 0.005) basePx = snapped;
      return { unit: upem / basePx, basePx: +basePx.toFixed(3), exact: true };
    }
  }
  // Font không vẽ theo lưới: lấy cạnh của dấu chấm "." làm 1 pixel (xấp xỉ)
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
    file: src.file ?? null,
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
  const data = Object.fromEntries(report.map((r) => [r.name, { file: r.file, basePx: r.basePx, exact: r.exact, missing: r.missingChars }]));
  writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
  console.log(`\nĐã ghi ${out}`);
}
