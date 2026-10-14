import { useEffect, useState } from 'preact/hooks';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/geist-pixel/400.css';
import '@fontsource/inter/400.css';
import metrics from './font-metrics.json';
import './font-test.css';

// Trang thử font (?fonts) — task 001. Số liệu cỡ gốc + glyph thiếu lấy từ
// scripts/check-font-glyphs.mjs --write

const SAMPLE = 'Chúc mừng sinh nhật! Hỗ trợ dân Design — Bá Lương tặng. Ặ ẫ ỡ ự ổ ề Đ đ 0123456789';
const SCALES = [1, 2, 3, 4];

type Metric = { basePx: number | null; exact: boolean | null; missing: string };
const M = metrics as Record<string, Metric>;

type FontDef = { name: string; family: string; pixel: boolean; file?: string };

const FONTS: FontDef[] = [
  { name: 'm5x7', family: 'm5x7', pixel: true, file: 'm5x7.ttf' },
  { name: 'm6x11', family: 'm6x11', pixel: true, file: 'm6x11.ttf' },
  { name: 'm6x11plus', family: 'm6x11plus', pixel: true, file: 'm6x11plus.ttf' },
  { name: 'Pixelify Sans', family: 'Pixelify Sans', pixel: true },
  { name: 'Geist Pixel', family: 'Geist Pixel', pixel: true },
  { name: 'Nunito', family: 'Nunito', pixel: false },
  { name: 'Inter', family: 'Inter', pixel: false },
];

// Nạp font tự host trong public/fonts nếu file có mặt; trả về false nếu thiếu
async function loadLocal(def: FontDef): Promise<boolean> {
  const url = `${import.meta.env.BASE_URL}fonts/${def.file}`;
  try {
    const face = new FontFace(def.family, `url(${url})`);
    await face.load();
    document.fonts.add(face);
    return true;
  } catch {
    return false;
  }
}

function FontRow({ def }: { def: FontDef }) {
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>(def.file ? 'loading' : 'ok');
  useEffect(() => {
    if (def.file) loadLocal(def).then((ok) => setState(ok ? 'ok' : 'missing'));
  }, [def]);

  const m = M[def.name];
  const missing = m?.missing ?? '';
  const missingCount = [...missing].length;

  return (
    <section class="font-row">
      <h2>
        {def.name}
        {m?.basePx && (
          <small>
            {' '}· cỡ gốc {m.basePx}px{m.exact === false ? ' (xấp xỉ, font không vẽ đúng lưới)' : ''}
          </small>
        )}
        <small> · thiếu {missingCount}/134 chữ có dấu</small>
      </h2>
      {state === 'missing' && <p class="warn">Thiếu file public/fonts/{def.file}</p>}
      {state === 'loading' && <p class="muted">Đang tải…</p>}
      {state === 'ok' &&
        (def.pixel && m?.basePx ? (
          SCALES.map((k) => {
            const size = m.basePx! * k;
            return (
              <p
                key={k}
                class="sample pixel-text"
                style={{ fontFamily: `'${def.family}', monospace`, fontSize: `${size}px`, lineHeight: `${Math.round(size * 1.4)}px` }}
              >
                <span class="scale">×{k}</span>
                {SAMPLE}
              </p>
            );
          })
        ) : (
          [16, 20].map((size) => (
            <p key={size} class="sample" style={{ fontFamily: `'${def.family}', sans-serif`, fontSize: `${size}px` }}>
              <span class="scale">{size}px</span>
              {SAMPLE}
            </p>
          ))
        ))}
      {missingCount > 0 && <p class="missing">Thiếu: {missing}</p>}
    </section>
  );
}

export function FontTest() {
  return (
    <main class="font-test">
      <h1>Thử font</h1>
      <p class="muted">
        Font pixel chỉ hiển thị ở bội số nguyên của cỡ gốc. Trên Windows, Chrome vẫn khử răng cưa chữ web font; xem trên
        điện thoại / macOS để đánh giá độ sắc.
      </p>
      {FONTS.map((f) => (
        <FontRow key={f.name} def={f} />
      ))}
    </main>
  );
}
