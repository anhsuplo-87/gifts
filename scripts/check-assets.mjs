// Kiểm tra mọi asset trong src/voucher/assets.ts: có file và đúng kích thước. Chạy trong `npm run build`.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { allAssetFiles } from '../src/voucher/assets.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
let ok = 0;

for (const a of allAssetFiles()) {
  const file = join(root, 'public', a.path);
  if (!existsSync(file)) {
    errors.push(`THIẾU   ${a.path} (cần ${a.w}×${a.h})`);
    continue;
  }
  let png;
  try {
    png = PNG.sync.read(readFileSync(file));
  } catch (e) {
    errors.push(`HỎNG    ${a.path}: không đọc được PNG (${e.message})`);
    continue;
  }
  if (png.width !== a.w || png.height !== a.h) {
    errors.push(`SAI CỠ  ${a.path}: ${png.width}×${png.height}, cần ${a.w}×${a.h}`);
    continue;
  }
  ok++;
}

if (errors.length) {
  console.error(`check:assets — ${errors.length} lỗi:\n  ` + errors.join('\n  '));
  console.error('Gợi ý: npm run gen:placeholders (thêm -- --force nếu vừa đổi kích thước trong src/voucher/layout.ts)');
  process.exit(1);
}
console.log(`check:assets — ${ok} file đúng kích thước`);
