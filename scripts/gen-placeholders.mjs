// Sinh hình placeholder cho mọi asset trong src/voucher/assets.ts (kích thước lấy từ layout.ts).
// Chạy: npm run gen:placeholders            → chỉ ghi file CHƯA có (không đè hình vẽ thật)
//       npm run gen:placeholders -- --force → ghi đè tất cả
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { allAssetFiles } from '../src/voucher/assets.ts';
import { PALETTES, COMMON } from '../src/voucher/themes.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');

// ───────────── Bút vẽ pixel ─────────────
function hex(c) {
  const s = c.replace('#', '');
  const n = s.length === 8 ? s : s + 'ff';
  return [0, 2, 4, 6].map((i) => parseInt(n.slice(i, i + 2), 16));
}
const T = null; // trong suốt

class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.png = new PNG({ width: w, height: h });
    this.png.data.fill(0);
  }
  set(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    if (c === T) {
      this.png.data[i + 3] = 0;
      return;
    }
    const [r, g, b, a] = hex(c);
    this.png.data.set([r, g, b, a], i);
  }
  rect(x, y, w, h, c) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }
  frame(x, y, w, h, c) {
    this.rect(x, y, w, 1, c);
    this.rect(x, y + h - 1, w, 1, c);
    this.rect(x, y, 1, h, c);
    this.rect(x + w - 1, y, 1, h, c);
  }
  dashed(x, y, w, h, c, on = 2, off = 2) {
    const p = on + off;
    for (let i = 0; i < w; i++) if (i % p < on) (this.set(x + i, y, c), this.set(x + i, y + h - 1, c));
    for (let j = 0; j < h; j++) if (j % p < on) (this.set(x, y + j, c), this.set(x + w - 1, y + j, c));
  }
  disc(cx, cy, r, c) {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r) this.set(cx + i, cy + j, c);
  }
  ring(cx, cy, r, c) {
    for (let j = -r; j <= r; j++)
      for (let i = -r; i <= r; i++) {
        const d = i * i + j * j;
        if (d <= r * r + r && d > (r - 1) * (r - 1) + (r - 1)) this.set(cx + i, cy + j, c);
      }
  }
  /** Vẽ bitmap ASCII, map ký tự → màu */
  bitmap(rows, map, ox = 0, oy = 0, scale = 1) {
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        const c = map[ch];
        if (c !== undefined) this.rect(ox + x * scale, oy + y * scale, scale, scale, c);
      }),
    );
  }
  save(path) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, PNG.sync.write(this.png));
  }
}

// ───────────── Bitmap 16×16 ─────────────
const ICONS = {
  question: [
    '................',
    '.....kkkkkk.....',
    '....kaaaaaak....',
    '...kaakkkkaak...',
    '...kaak..kaak...',
    '....kk...kaak...',
    '........kaak....',
    '.......kaak.....',
    '......kaak......',
    '......kaak......',
    '.......kk.......',
    '................',
    '.......kk.......',
    '......kaak......',
    '.......kk.......',
    '................',
  ],
  flip: [
    '................',
    '.....kkkkkk.....',
    '...kk......kk...',
    '..k..........k..',
    '..k.......kkkkk.',
    '.k.........kkk..',
    '.k..........k...',
    '.k..............',
    '..............k.',
    '...k..........k.',
    '..kkk.........k.',
    '.kkkkk.......k..',
    '..k..........k..',
    '...kk......kk...',
    '.....kkkkkk.....',
    '................',
  ],
  login: [
    '................',
    '........kkkkkk..',
    '........k....k..',
    '........k....k..',
    '....k...k....k..',
    '....kk..k....k..',
    'kkkkkkk.k....k..',
    'kkkkkkkkk....k..',
    'kkkkkkk.k....k..',
    '....kk..k....k..',
    '....k...k....k..',
    '........k....k..',
    '........k....k..',
    '........kkkkkk..',
    '................',
    '................',
  ],
  logout: [
    '................',
    '.kkkkkk.........',
    '.k....k.........',
    '.k....k.........',
    '.k....k...k.....',
    '.k....k...kk....',
    '.k....kkkkkkk...',
    '.k....kkkkkkkk..',
    '.k....kkkkkkk...',
    '.k....k...kk....',
    '.k....k...k.....',
    '.k....k.........',
    '.k....k.........',
    '.kkkkkk.........',
    '................',
    '................',
  ],
  peel: [
    '................',
    '.kkkkkkkkkkk....',
    '.kwwwwwwwwwkk...',
    '.kwwwwwwwwwk.k..',
    '.kwwwwwwwwwkkkk.',
    '.kwwwwwwwwwwwwk.',
    '.kwwwwwwwwwwwwk.',
    '.kwwwwwwwwwwwwk.',
    '.kwwwwwwwwwwwwk.',
    '.kwwwwwwwwwwkkk.',
    '.kwwwwwwwwwkaak.',
    '.kwwwwwwwwkaak..',
    '.kwwwwwwwkaak...',
    '.kwwwwwwkaak....',
    '.kkkkkkkkkk.....',
    '................',
  ],
  check: [
    '................',
    '................',
    '.............kk.',
    '............kkk.',
    '...........kkk..',
    '..........kkk...',
    '.kk......kkk....',
    '.kkk....kkk.....',
    '..kkk..kkk......',
    '...kkkkkk.......',
    '....kkkk........',
    '.....kk.........',
    '................',
    '................',
    '................',
    '................',
  ],
  close: [
    '................',
    '................',
    '..kk........kk..',
    '..kkk......kkk..',
    '...kkk....kkk...',
    '....kkk..kkk....',
    '.....kkkkkk.....',
    '......kkkk......',
    '......kkkk......',
    '.....kkkkkk.....',
    '....kkk..kkk....',
    '...kkk....kkk...',
    '..kkk......kkk..',
    '..kk........kk..',
    '................',
    '................',
  ],
};
for (const [k, rows] of Object.entries(ICONS)) {
  if (rows.length !== 16 || rows.some((r) => r.length !== 16)) throw new Error(`Icon ${k} không phải 16×16`);
}

// ───────────── Các kiểu hình ─────────────

/** Nền vé: răng cưa trên/dưới, khuyết bán nguyệt hai bên, viền 1px */
function ticket(cv, fill, border) {
  const { w, h } = cv;
  cv.rect(0, 0, w, h, fill);
  cv.frame(0, 0, w, h, border);
  // răng cưa 2px ở mép trên/dưới
  for (let x = 0; x < w; x++) {
    if (Math.floor(x / 2) % 2 === 0) {
      cv.set(x, 0, T);
      cv.set(x, h - 1, T);
      cv.set(x, 1, border);
      cv.set(x, h - 2, border);
    }
  }
  // khuyết hai bên
  const r = 4;
  const cy = Math.floor(h / 2);
  cv.disc(0, cy, r, T);
  cv.disc(w - 1, cy, r, T);
  for (let j = -r - 1; j <= r + 1; j++)
    for (let i = 0; i <= r + 1; i++) {
      const d = i * i + j * j;
      if (d > r * r + r && d <= (r + 1) * (r + 1) + r + 1) {
        cv.set(i, cy + j, border);
        cv.set(w - 1 - i, cy + j, border);
      }
    }
}

const draw = {
  'voucher-front'(cv, P) {
    ticket(cv, P.paper, P.shadow);
    const { w, h } = cv;
    // khung nét đứt bên trong, chừa vùng chữ (lề 6)
    cv.dashed(3, 3, w - 6, h - 6, P.accent, 3, 2);
    for (const [x, y] of [[3, 3], [w - 6, 3], [3, h - 6], [w - 6, h - 6]]) cv.rect(x, y, 3, 3, P.accent2);
  },
  'voucher-deco'(cv, P) {
    const { w, h } = cv;
    const star = (x, y, c) => {
      cv.set(x, y, c);
      cv.set(x - 1, y, c);
      cv.set(x + 1, y, c);
      cv.set(x, y - 1, c);
      cv.set(x, y + 1, c);
    };
    star(w - 12, 8, P.pop);
    star(10, h - 10, P.pop);
    star(w - 20, h - 7, P.accent2);
    star(16, 6, P.accent2);
    cv.set(w - 8, 14, P.pop);
    cv.set(22, h - 6, P.accent);
  },
  'voucher-back'(cv, P) {
    ticket(cv, P.paper, P.shadow);
    const { w } = cv;
    // đường chấm dưới dòng tiêu đề
    for (let x = 6; x < w - 6; x += 2) cv.set(x, 21, P.line);
  },
  'voucher-blank'(cv) {
    ticket(cv, '#ffffff', '#d6d6dc');
    cv.frame(3, 3, cv.w - 6, cv.h - 6, '#f0f0f4');
  },
  'voucher-shine'(cv) {
    const { w, h } = cv;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const d = x + y;
        if ((d >= 40 && d < 50) || (d >= 56 && d < 59)) cv.set(x, y, '#ffffff38');
      }
  },
  slot(cv, P) {
    const { w, h } = cv;
    cv.rect(1, 1, w - 2, h - 2, P.paper2 + 'b0');
    cv.dashed(0, 0, w, h, P.accent2, 2, 2);
    const arm = Math.max(2, Math.floor(w / 10));
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    cv.rect(cx - arm, cy, arm * 2, 1, P.line);
    cv.rect(cx, cy - arm, 1, arm * 2, P.line);
  },
  sticker(cv, P, theme) {
    if (theme === 'gamer') cartridge(cv, P);
    else giftBox(cv, P.accent, P.accent2, P.pop, P.ink);
  },
  'bg-tile'(cv, P, theme) {
    cv.rect(0, 0, cv.w, cv.h, P.bg);
    if (theme === 'gamer') {
      for (let i = 0; i < cv.w; i += 2) (cv.set(i, 0, P.bg2), cv.set(0, i, P.bg2));
      cv.set(16, 16, P.line);
    } else {
      cv.rect(7, 7, 2, 2, P.bg2);
      cv.rect(23, 23, 2, 2, P.bg2);
    }
  },
  'frame-dialog'(cv) {
    const { w, h } = cv;
    cv.rect(2, 2, w - 4, h - 4, COMMON.paper);
    cv.frame(1, 1, w - 2, h - 2, COMMON.ink);
    cv.frame(0, 2, w, h - 4, COMMON.ink);
    cv.frame(2, 0, w - 4, h, COMMON.ink);
    cv.frame(3, 3, w - 6, h - 6, COMMON.line);
  },
  'frame-tray'(cv) {
    const { w, h } = cv;
    cv.rect(1, 1, w - 2, h - 2, COMMON.paper + 'e6');
    cv.frame(0, 1, w, h - 2, COMMON.ink);
    cv.frame(1, 0, w - 2, h, COMMON.ink);
    cv.set(1, 1, COMMON.ink);
    cv.set(w - 2, 1, COMMON.ink);
    cv.set(1, h - 2, COMMON.ink);
    cv.set(w - 2, h - 2, COMMON.ink);
  },
  'btn:primary'(cv) {
    button(cv, COMMON.accent, COMMON.accentDark, '#ff9a88', false);
  },
  'btn:pressed'(cv) {
    button(cv, COMMON.accentDark, COMMON.accentDark, COMMON.accentDark, true);
  },
  'btn:secondary'(cv) {
    button(cv, COMMON.paper, COMMON.line, '#ffffff', false);
  },
  'mascot-sad'(cv) {
    cv.disc(16, 17, 12, COMMON.ink);
    cv.disc(16, 17, 11, COMMON.pop);
    cv.rect(10, 13, 3, 3, COMMON.ink);
    cv.rect(19, 13, 3, 3, COMMON.ink);
    // miệng buồn
    cv.rect(12, 23, 8, 1, COMMON.ink);
    cv.set(11, 24, COMMON.ink);
    cv.set(20, 24, COMMON.ink);
    // giọt nước mắt
    cv.rect(10, 17, 2, 3, COMMON.accent2);
    cv.set(10, 20, COMMON.accent2);
  },
  'browser-warning'(cv) {
    cv.rect(2, 5, 28, 22, COMMON.paper);
    cv.frame(2, 5, 28, 22, COMMON.ink);
    cv.rect(3, 6, 26, 4, COMMON.line);
    cv.rect(4, 7, 2, 2, COMMON.accent);
    cv.rect(7, 7, 2, 2, COMMON.pop);
    cv.rect(10, 7, 2, 2, COMMON.accent2);
    cv.rect(15, 12, 2, 8, COMMON.accent);
    cv.rect(15, 22, 2, 2, COMMON.accent);
  },
  gift(cv) {
    if (cv.w > 32) cv.rect(0, 0, cv.w, cv.h, PALETTES.designer.bg);
    const pad = Math.floor(cv.w / 8);
    const inner = new Canvas(cv.w - pad * 2, cv.h - pad * 2);
    giftBox(inner, COMMON.accent, COMMON.accent2, COMMON.pop, COMMON.ink);
    for (let y = 0; y < inner.h; y++)
      for (let x = 0; x < inner.w; x++) {
        const i = (y * inner.w + x) * 4;
        const d = inner.png.data;
        if (d[i + 3]) {
          const c = '#' + [d[i], d[i + 1], d[i + 2], d[i + 3]].map((v) => v.toString(16).padStart(2, '0')).join('');
          cv.set(x + pad, y + pad, c);
        }
      }
  },
};

function button(cv, fill, bottom, top, pressed) {
  const { w, h } = cv;
  cv.rect(1, 1, w - 2, h - 2, fill);
  if (!pressed) {
    cv.rect(1, h - 3, w - 2, 2, bottom);
    cv.rect(2, 1, w - 4, 1, top);
  } else {
    cv.rect(1, 1, w - 2, 1, bottom);
  }
  cv.frame(0, 1, w, h - 2, COMMON.ink);
  cv.frame(1, 0, w - 2, h, COMMON.ink);
}

/** Hộp quà co giãn theo kích thước */
function giftBox(cv, body, ribbon, bow, ink) {
  const { w, h } = cv;
  const m = Math.max(1, Math.floor(w / 12)); // lề trong suốt
  const lidY = Math.floor(h * 0.38);
  const lidH = Math.max(2, Math.floor(h / 7));
  const bx = m + 1;
  const bw = w - 2 * (m + 1);
  // thân hộp
  cv.rect(bx, lidY + lidH, bw, h - m - lidY - lidH, body);
  cv.frame(bx, lidY + lidH - 1, bw, h - m - lidY - lidH + 1, ink);
  // nắp
  cv.rect(m, lidY, w - 2 * m, lidH, body);
  cv.frame(m, lidY, w - 2 * m, lidH, ink);
  // ruy băng
  const rw = Math.max(2, Math.floor(w / 6));
  const rx = Math.floor((w - rw) / 2);
  cv.rect(rx, lidY + 1, rw, h - m - lidY - 2, ribbon);
  // nơ
  const br = Math.max(2, Math.floor(w / 7));
  cv.disc(rx - br + 1, lidY - br + 1, br, bow);
  cv.disc(rx + rw + br - 2, lidY - br + 1, br, bow);
  cv.ring(rx - br + 1, lidY - br + 1, br, ink);
  cv.ring(rx + rw + br - 2, lidY - br + 1, br, ink);
  cv.rect(rx, lidY - 2, rw, 3, ribbon);
}

/** Băng game co giãn theo kích thước */
function cartridge(cv, P) {
  const { w, h } = cv;
  const m = Math.max(1, Math.floor(w / 12));
  const x = m + 1;
  const y = m;
  const cw = w - 2 * (m + 1);
  const ch = h - 2 * m;
  cv.rect(x, y, cw, ch, '#8c93b8');
  cv.frame(x, y, cw, ch, P.shadow);
  // khía góc trên phải
  const n = Math.max(2, Math.floor(w / 8));
  cv.rect(x + cw - n, y, n, n, T);
  cv.rect(x + cw - n - 1, y, 1, n, P.shadow);
  cv.rect(x + cw - n, y + n, n, 1, P.shadow);
  // nhãn
  const lx = x + Math.max(2, Math.floor(cw / 6));
  const lw = cw - 2 * Math.max(2, Math.floor(cw / 6));
  const ly = y + n + 1;
  const lh = Math.floor(ch * 0.45);
  cv.rect(lx, ly, lw, lh, P.accent);
  cv.frame(lx, ly, lw, lh, P.shadow);
  cv.rect(lx + 1, ly + 1, Math.max(1, Math.floor(lw / 3)), Math.max(1, Math.floor(lh / 3)), P.pop);
  // chân tiếp xúc
  for (let i = x + 2; i < x + cw - 2; i += 2) cv.rect(i, y + ch - Math.max(2, Math.floor(h / 8)), 1, Math.max(1, Math.floor(h / 10)), '#ffd75e');
}

// ───────────── Chạy ─────────────
const COLORS = { k: COMMON.ink, a: COMMON.accent, w: COMMON.white, g: COMMON.accent2, p: COMMON.pop };
let written = 0;
let skipped = 0;
for (const a of allAssetFiles()) {
  const out = join(root, 'public', a.path);
  if (existsSync(out) && !force) {
    skipped++;
    continue;
  }
  const cv = new Canvas(a.w, a.h);
  const P = PALETTES[a.theme ?? 'designer'];
  if (a.kind.startsWith('icon:')) {
    const rows = ICONS[a.kind.slice(5)];
    const s = Math.floor(Math.min(a.w, a.h) / 16);
    cv.bitmap(rows, COLORS, Math.floor((a.w - 16 * s) / 2), Math.floor((a.h - 16 * s) / 2), s);
  } else {
    const fn = draw[a.kind];
    if (!fn) throw new Error(`Không biết vẽ kiểu "${a.kind}" (${a.path})`);
    fn(cv, P, a.theme);
  }
  cv.save(out);
  written++;
}
console.log(`gen:placeholders — ghi ${written} file, bỏ qua ${skipped} file đã có${force ? '' : ' (dùng --force để ghi đè)'}`);
