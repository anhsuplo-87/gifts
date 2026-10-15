import { useEffect, useState } from 'preact/hooks';
import metrics from './font-metrics.json';
import './font-test.css';

// Trang thử font (?fonts) — task 001. Chỉ có ở bản dev (font dự phòng nằm trong public/fonts/_unused). Số liệu cỡ gốc + glyph thiếu lấy từ
// scripts/check-font-glyphs.mjs --write

const SAMPLE = 'Chúc mừng sinh nhật! Hỗ trợ dân Design — Bá Lương tặng. Ặ ẫ ỡ ự ổ ề Đ đ 0123456789';
const SCALES = [1, 2, 3, 4];

type Metric = { file: string | null; basePx: number | null; exact: boolean | null; missing: string };
const M = metrics as Record<string, Metric>;

type FontDef = { name: string; family: string; pixel: boolean; file?: string };

const missingCount = (name: string) => [...(M[name]?.missing ?? '')].length;

// Font trong public/fonts (lấy từ font-metrics.json), font đủ dấu lên đầu
const LOCAL: FontDef[] = Object.entries(M)
  .filter(([, m]) => m.file)
  .map(([name, m]) => ({ name, family: `local ${name}`, pixel: true, file: m.file! }))
  .sort((a, b) => missingCount(a.name) - missingCount(b.name) || a.name.localeCompare(b.name));

const FONTS: FontDef[] = [
  ...LOCAL,
  { name: 'Nunito', family: 'Nunito', pixel: false },
];

// Nạp font tự host trong public/fonts nếu file có mặt; trả về false nếu thiếu
async function loadLocal(def: FontDef): Promise<boolean> {
  const url = `${import.meta.env.BASE_URL}fonts/${encodeURI(def.file!)}`;
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
  const missingN = missingCount(def.name);

  return (
    <section class="font-row">
      <h2>
        {def.name}
        {m?.basePx && (
          <small>
            {' '}· cỡ gốc {m.basePx}px{m.exact === false ? ' (xấp xỉ, font không vẽ đúng lưới)' : ''}
          </small>
        )}
        {missingN === 0 ? <small class="ok"> · đủ 134/134 chữ có dấu ✓</small> : <small> · thiếu {missingN}/134 chữ có dấu</small>}
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
                <span class="scale" title={Number.isInteger(size) ? '' : 'Cỡ lẻ, có thể nhoè'}>
                  ×{k}
                  <br />
                  {+size.toFixed(2)}px{Number.isInteger(size) ? '' : '*'}
                </span>
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
      {missingN > 0 && <p class="missing">Thiếu: {missing}</p>}
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
