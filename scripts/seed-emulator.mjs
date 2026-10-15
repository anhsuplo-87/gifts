// Nạp dữ liệu giả vào Firebase Emulator (auth + firestore) cho `npm run dev:emu`.
// - Rules: đọc firestore.rules, thay UID admin bằng 'admin-test' rồi nạp vào emulator qua REST
//   (KHÔNG sửa file firestore.rules).
// - Tài khoản Google giả: designer@test.local, gamer@test.local, reveal@test.local, nhom@test.local,
//   moi@test.local (chưa có voucher — để admin tạo thử), admin@test.local (uid admin-test).
// - Dữ liệu: 4 voucher (nhom@ có sticker ×3 theo `group`). Email đều là email giả .test.local — không có email thật trong repo.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'demo-gifts';
const FS = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const ADMIN_UID = 'admin-test';

async function call(method, url, body) {
  const res = await fetch(url, { method, headers: OWNER, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json().catch(() => null);
}

// ── Giá trị Firestore REST ──
function val(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  return { stringValue: String(v) };
}
const fields = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, val(v)])) });
const docUrl = (path) => `http://${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${path.split('/').map(encodeURIComponent).join('/')}`;
const put = (path, data) => call('PATCH', docUrl(path), fields(data));

const HOUR = 3600e3;
const DAY = 24 * HOUR;
const ago = (ms) => new Date(Date.now() - ms);

async function main() {
  // 1. Rules với UID admin giả
  const rules = readFileSync(join(root, 'firestore.rules'), 'utf8');
  const re = /function adminUid\(\) \{ return '[^']*'; \}/;
  if (!re.test(rules)) throw new Error('Không tìm thấy dòng adminUid() trong firestore.rules');
  await call('PUT', `http://${FS}/emulator/v1/projects/${PROJECT}:securityRules`, {
    rules: { files: [{ name: 'firestore.rules', content: rules.replace(re, `function adminUid() { return '${ADMIN_UID}'; }`) }] },
  });

  // 2. Xoá sạch rồi tạo tài khoản
  await call('DELETE', `http://${FS}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`);
  await call('DELETE', `http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`);
  const user = (email, localId = `uid-${email.split('@')[0]}`) => ({
    localId,
    email,
    emailVerified: true,
    displayName: email.split('@')[0],
    // sub = 'sub-<email>' khớp với lối đăng nhập nhanh ?emu&as=<email> trong FirestoreRepo
    providerUserInfo: [{ providerId: 'google.com', rawId: `sub-${email}`, email, displayName: email.split('@')[0] }],
  });
  await call('POST', `http://${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:batchCreate`, {
    users: [user('designer@test.local'), user('gamer@test.local'), user('reveal@test.local'), user('nhom@test.local'), user('moi@test.local'), user('admin@test.local', ADMIN_UID)],
  });

  // 3. Voucher
  const base = {
    giverName: 'Bá Lương',
    bgSeed: 'demo000',
    revealText: 'Chúc mừng sinh nhật — chạm để tiết lộ',
    createdAt: ago(3 * DAY),
    updatedAt: ago(3 * DAY),
  };
  const item = (i, title, description, extra = {}) => ({
    title,
    description,
    image: null,
    order: i,
    used: false,
    usedAt: null,
    slot: null,
    createdAt: ago(3 * DAY),
    updatedAt: ago(3 * DAY),
    ...extra,
  });

  const D = 'vouchers/designer@test.local';
  await put(D, {
    ...base,
    theme: 'designer',
    title: 'Hỗ trợ dân Design',
    recipientName: 'Bạn Thử Nghiệm',
    message: 'Chúc bạn tuổi mới nhiều cảm hứng, ít deadline! (dữ liệu emulator)',
    slots: 8,
    expiresAt: new Date(Date.now() + 120 * DAY),
    revealedAt: ago(2 * DAY),
  });
  const designer = [
    ['Mua font khẩn cấp', 'Một bộ font bạn thèm từ lâu.'],
    ['Cà phê cứu deadline', 'Một ly cà phê to nhất quán.'],
    ['Một tháng subscription', 'Một tháng phần mềm bạn đang cần.'],
    ['Gói mockup', 'Một gói mockup xịn.'],
    ['Lẩu đổi brief lần 5', 'Một bữa lẩu an ủi.'],
    ['Khoá học online', 'Một khoá học bạn chọn.'],
  ];
  for (const [i, [t, d]] of designer.entries()) {
    const extra = i === 1 ? { used: true, usedAt: ago(3 * DAY), slot: 0 } : i === 3 ? { used: true, usedAt: ago(HOUR), slot: 2 } : {};
    await put(`${D}/items/d${i + 1}`, item(i, t, d, extra));
  }

  const G = 'vouchers/gamer@test.local';
  await put(G, {
    ...base,
    theme: 'gamer',
    title: 'Săn game cùng Bá Lương',
    recipientName: 'Bạn Game Thủ',
    message: 'Một game, chọn kỹ nha! (dữ liệu emulator)',
    slots: 1,
    expiresAt: null,
    revealedAt: ago(DAY),
  });
  for (let i = 0; i < 6; i++) await put(`${G}/items/g${i + 1}`, item(i, `Game bí ẩn #${i + 1}`, `Tựa game bí mật số ${i + 1}.`));

  const R = 'vouchers/reveal@test.local';
  await put(R, {
    ...base,
    theme: 'designer',
    title: 'Hỗ trợ dân Design',
    recipientName: 'Bạn Chưa Mở',
    message: 'Voucher này chưa được tiết lộ. (dữ liệu emulator)',
    slots: 4,
    expiresAt: null,
    revealedAt: null,
  });
  for (const [i, [t, d]] of designer.slice(0, 4).entries()) await put(`${R}/items/r${i + 1}`, item(i, t, d));

  // Sticker có số lượng: 3 bản "Bộ font" cùng group (1 bản đã dán) + 2 sticker lẻ
  const N = 'vouchers/nhom@test.local';
  await put(N, {
    ...base,
    bgSeed: 'nhom001',
    theme: 'designer',
    title: 'Quà có số lượng',
    recipientName: 'Bạn Nhiều Bản',
    message: 'Voucher thử sticker ×N. (dữ liệu emulator)',
    slots: 5,
    expiresAt: null,
    revealedAt: ago(DAY),
  });
  const grouped = [
    ['Bộ Font Family', 'Một bộ font tự chọn.', 'font', { used: true, usedAt: ago(2 * HOUR), slot: 0 }],
    ['Bộ Font Family', 'Một bộ font tự chọn.', 'font', {}],
    ['Bộ Font Family', 'Một bộ font tự chọn.', 'font', {}],
    ['Cà phê cứu deadline', 'Một ly cà phê to nhất quán.', 'cafe', {}],
    ['Gói mockup', 'Một gói mockup xịn.', 'mock', {}],
  ];
  for (const [i, [t, d, group, extra]] of grouped.entries()) await put(`${N}/items/n${i + 1}`, item(i, t, d, { group, ...extra }));

  console.log('seed-emulator: xong — designer@ / gamer@ / reveal@ / nhom@ / moi@ / admin@test.local (uid admin-test)');
}

main().catch((e) => {
  console.error('seed-emulator lỗi:', e.message);
  process.exit(1);
});
