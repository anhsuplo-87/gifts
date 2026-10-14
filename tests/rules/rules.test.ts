// Test firestore.rules theo ma trận SPEC §6.1. Chạy: npm run test:rules
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it, expect } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';

// Dữ liệu giả, không phải email thật
const ADMIN_UID = 'test-admin-uid';
const ADMIN_EMAIL = 'admin@example.com';
const MAI = 'mai@example.com';
const LAN = 'lan@example.com';
const V_MAI = `vouchers/${MAI}`;
const V_LAN = `vouchers/${LAN}`;

const HOUR = 3600 * 1000;
const ago = (ms: number) => Timestamp.fromMillis(Date.now() - ms);

// Thay UID admin trong rules bằng UID giả — dòng adminUid() có giá trị gì cũng được
function loadRules(): string {
  const src = readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8');
  const re = /function adminUid\(\) \{ return '[^']*'; \}/;
  if (!re.test(src)) throw new Error('Không tìm thấy dòng adminUid() trong firestore.rules');
  return src.replace(re, `function adminUid() { return '${ADMIN_UID}'; }`);
}

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-gifts',
    firestore: { rules: loadRules() },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const voucher = {
      theme: 'designer',
      title: 'Hỗ trợ dân Design',
      recipientName: 'Mai',
      giverName: 'Bá Lương',
      message: 'Chúc mừng sinh nhật',
      revealText: 'Chúc mừng sinh nhật — chạm để tiết lộ',
      slots: 8,
      expiresAt: null,
      revealedAt: null,
      createdAt: ago(48 * HOUR),
      updatedAt: ago(48 * HOUR),
    };
    const item = (extra: object) => ({
      title: 'Figma Pro 3 tháng',
      description: '',
      image: null,
      order: 0,
      used: false,
      usedAt: null,
      slot: null,
      createdAt: ago(48 * HOUR),
      updatedAt: ago(48 * HOUR),
      ...extra,
    });
    await setDoc(doc(db, V_MAI), voucher);
    await setDoc(doc(db, `${V_MAI}/items/fresh`), item({}));
    await setDoc(doc(db, `${V_MAI}/items/stuck1h`), item({ used: true, usedAt: ago(1 * HOUR), slot: 2 }));
    await setDoc(doc(db, `${V_MAI}/items/stuck25h`), item({ used: true, usedAt: ago(25 * HOUR), slot: 3 }));
    await setDoc(doc(db, `${V_MAI}/history/h1`), { title: 'Sinh nhật 2025', date: ago(400 * 24 * HOUR), note: '', image: null });
    await setDoc(doc(db, V_LAN), { ...voucher, recipientName: 'Lan' });
    await setDoc(doc(db, `${V_LAN}/items/x`), item({}));
    await setDoc(doc(db, 'secrets/x'), { a: 1 });
  });
});

const user = (uid: string, email: string, verified = true): Firestore =>
  env.authenticatedContext(uid, { email, email_verified: verified }).firestore() as unknown as Firestore;
const adminDb = () => user(ADMIN_UID, ADMIN_EMAIL);
const maiDb = () => user('mai-uid', MAI);
const anonDb = () => env.unauthenticatedContext().firestore() as unknown as Firestore;

const stick = (slot: unknown = 4) => ({ used: true, usedAt: serverTimestamp(), slot });
const unstick = { used: false, usedAt: null, slot: null };
const newItem = { title: 'Mới', description: '', image: null, order: 1, used: false, usedAt: null, slot: null };

// ───────────────────────── Admin ─────────────────────────
describe('Admin', () => {
  it('admin list collection vouchers', async () => {
    const snap = await assertSucceeds(getDocs(collection(adminDb(), 'vouchers')));
    expect(snap.size).toBe(2);
  });
  it('admin get/create/update/delete voucher', async () => {
    const db = adminDb();
    await assertSucceeds(getDoc(doc(db, V_MAI)));
    await assertSucceeds(setDoc(doc(db, 'vouchers/new@example.com'), { title: 'x', revealedAt: null }));
    await assertSucceeds(updateDoc(doc(db, V_MAI), { title: 'Đổi tên', message: 'mới' }));
    await assertSucceeds(deleteDoc(doc(db, V_LAN)));
  });
  it('admin list/create/update/delete items', async () => {
    const db = adminDb();
    await assertSucceeds(getDocs(collection(db, `${V_MAI}/items`)));
    await assertSucceeds(setDoc(doc(db, `${V_MAI}/items/new`), newItem));
    await assertSucceeds(updateDoc(doc(db, `${V_MAI}/items/fresh`), { title: 'Đổi', used: true, usedAt: Timestamp.now(), slot: 0 }));
    await assertSucceeds(updateDoc(doc(db, `${V_MAI}/items/stuck25h`), unstick)); // bóc thay bạn bè, quá 24h vẫn được
    await assertSucceeds(deleteDoc(doc(db, `${V_MAI}/items/new`)));
  });
  it('admin list/create/update/delete history', async () => {
    const db = adminDb();
    await assertSucceeds(getDocs(collection(db, `${V_MAI}/history`)));
    await assertSucceeds(setDoc(doc(db, `${V_MAI}/history/h2`), { title: 'x' }));
    await assertSucceeds(updateDoc(doc(db, `${V_MAI}/history/h2`), { title: 'y' }));
    await assertSucceeds(deleteDoc(doc(db, `${V_MAI}/history/h2`)));
  });
  it('admin reset revealedAt về null', async () => {
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), V_MAI), { revealedAt: ago(HOUR) }));
    await assertSucceeds(updateDoc(doc(adminDb(), V_MAI), { revealedAt: null }));
  });
  it('admin query collection group items ("Mới dán")', async () => {
    const q = query(collectionGroup(adminDb(), 'items'), where('used', '==', true), orderBy('usedAt', 'desc'));
    const snap = await assertSucceeds(getDocs(q));
    expect(snap.size).toBe(2);
  });
});

// ───────────────────────── Owner ─────────────────────────
describe('Owner — được phép', () => {
  it('owner get voucher của mình', async () => {
    await assertSucceeds(getDoc(doc(maiDb(), V_MAI)));
  });
  it('owner list items của mình', async () => {
    await assertSucceeds(getDocs(collection(maiDb(), `${V_MAI}/items`)));
  });
  it('owner list history của mình', async () => {
    await assertSucceeds(getDocs(collection(maiDb(), `${V_MAI}/history`)));
  });
  it('owner đặt revealedAt = giờ server khi đang null', async () => {
    await assertSucceeds(updateDoc(doc(maiDb(), V_MAI), { revealedAt: serverTimestamp() }));
  });
  it('owner dán sticker (usedAt = giờ server, slot 0 và 9)', async () => {
    await assertSucceeds(updateDoc(doc(maiDb(), `${V_MAI}/items/fresh`), stick(0)));
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), `${V_MAI}/items/fresh2`), newItem));
    await assertSucceeds(updateDoc(doc(maiDb(), `${V_MAI}/items/fresh2`), stick(9)));
  });
  it('owner bóc sticker dán 1 giờ trước (trong 24h)', async () => {
    await assertSucceeds(updateDoc(doc(maiDb(), `${V_MAI}/items/stuck1h`), unstick));
  });
  it('owner có token email viết HOA vẫn khớp (đọc + dán)', async () => {
    const db = user('mai-upper-uid', 'MAI@Example.COM');
    await assertSucceeds(getDoc(doc(db, V_MAI)));
    await assertSucceeds(updateDoc(doc(db, `${V_MAI}/items/fresh`), stick(1)));
  });
});

describe('Owner — bị chặn', () => {
  it('owner đọc voucher người khác', async () => {
    await assertFails(getDoc(doc(maiDb(), V_LAN)));
    await assertFails(getDocs(collection(maiDb(), `${V_LAN}/items`)));
  });
  it('owner list collection vouchers', async () => {
    await assertFails(getDocs(collection(maiDb(), 'vouchers')));
  });
  it('owner sửa field khác của voucher', async () => {
    await assertFails(updateDoc(doc(maiDb(), V_MAI), { title: 'Tự đổi' }));
    await assertFails(updateDoc(doc(maiDb(), V_MAI), { slots: 10 }));
  });
  it('owner tiết lộ kèm sửa field khác', async () => {
    await assertFails(updateDoc(doc(maiDb(), V_MAI), { revealedAt: serverTimestamp(), title: 'Tự đổi' }));
  });
  it('owner đặt lại revealedAt khi đã có', async () => {
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), V_MAI), { revealedAt: ago(HOUR) }));
    await assertFails(updateDoc(doc(maiDb(), V_MAI), { revealedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(maiDb(), V_MAI), { revealedAt: null }));
  });
  it('owner đặt revealedAt bằng giờ client', async () => {
    await assertFails(updateDoc(doc(maiDb(), V_MAI), { revealedAt: Timestamp.now() }));
  });
  it('owner create/delete voucher', async () => {
    await assertFails(setDoc(doc(maiDb(), `vouchers/${MAI}x`), { title: 'x' }));
    await assertFails(deleteDoc(doc(maiDb(), V_MAI)));
  });
  it('owner create/delete item', async () => {
    await assertFails(setDoc(doc(maiDb(), `${V_MAI}/items/new`), newItem));
    await assertFails(deleteDoc(doc(maiDb(), `${V_MAI}/items/fresh`)));
  });
  it('owner sửa title item', async () => {
    await assertFails(updateDoc(doc(maiDb(), `${V_MAI}/items/fresh`), { title: 'Tự đổi' }));
    await assertFails(updateDoc(doc(maiDb(), `${V_MAI}/items/fresh`), { ...stick(1), title: 'Tự đổi' }));
  });
  it('owner dán với usedAt do client đặt', async () => {
    await assertFails(updateDoc(doc(maiDb(), `${V_MAI}/items/fresh`), { used: true, usedAt: Timestamp.now(), slot: 1 }));
  });
  it('owner dán với slot ngoài 0–9 hoặc không phải số nguyên', async () => {
    const ref = doc(maiDb(), `${V_MAI}/items/fresh`);
    await assertFails(updateDoc(ref, stick(10)));
    await assertFails(updateDoc(ref, stick(-1)));
    await assertFails(updateDoc(ref, stick(1.5)));
    await assertFails(updateDoc(ref, stick('1')));
    await assertFails(updateDoc(ref, stick(null)));
  });
  it('owner dán sticker đã dán', async () => {
    await assertFails(updateDoc(doc(maiDb(), `${V_MAI}/items/stuck1h`), stick(5)));
  });
  it('owner bóc sticker dán 25 giờ trước (quá 24h)', async () => {
    await assertFails(updateDoc(doc(maiDb(), `${V_MAI}/items/stuck25h`), unstick));
  });
  it('owner bóc nhưng giữ lại slot/usedAt', async () => {
    await assertFails(updateDoc(doc(maiDb(), `${V_MAI}/items/stuck1h`), { used: false }));
  });
  it('owner ghi history', async () => {
    await assertFails(setDoc(doc(maiDb(), `${V_MAI}/history/h2`), { title: 'x' }));
    await assertFails(updateDoc(doc(maiDb(), `${V_MAI}/history/h1`), { title: 'x' }));
    await assertFails(deleteDoc(doc(maiDb(), `${V_MAI}/history/h1`)));
  });
  it('owner query collection group items', async () => {
    await assertFails(getDocs(query(collectionGroup(maiDb(), 'items'), where('used', '==', true))));
  });
  it('owner dán vào voucher người khác', async () => {
    await assertFails(updateDoc(doc(maiDb(), `${V_LAN}/items/x`), stick(1)));
  });
});

// ─────────────── Owner có email_verified = false ───────────────
describe('Owner email_verified=false — bị chặn tất cả', () => {
  const db = () => user('mai-unverified', MAI, false);
  it('không đọc được voucher, items, history', async () => {
    await assertFails(getDoc(doc(db(), V_MAI)));
    await assertFails(getDocs(collection(db(), `${V_MAI}/items`)));
    await assertFails(getDocs(collection(db(), `${V_MAI}/history`)));
  });
  it('không tiết lộ, dán, bóc được', async () => {
    await assertFails(updateDoc(doc(db(), V_MAI), { revealedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db(), `${V_MAI}/items/fresh`), stick(1)));
    await assertFails(updateDoc(doc(db(), `${V_MAI}/items/stuck1h`), unstick));
  });
});

// ─────────────── Người lạ đã đăng nhập / chưa đăng nhập ───────────────
for (const [label, getDb] of [
  ['Người lạ đã đăng nhập', () => user('stranger-uid', 'stranger@example.com')],
  ['Chưa đăng nhập', anonDb],
] as const) {
  describe(`${label} — bị chặn tất cả`, () => {
    it('không đọc được gì', async () => {
      const db = getDb();
      await assertFails(getDoc(doc(db, V_MAI)));
      await assertFails(getDocs(collection(db, 'vouchers')));
      await assertFails(getDocs(collection(db, `${V_MAI}/items`)));
      await assertFails(getDocs(collection(db, `${V_MAI}/history`)));
      await assertFails(getDocs(query(collectionGroup(db, 'items'), where('used', '==', true))));
    });
    it('không ghi được gì', async () => {
      const db = getDb();
      await assertFails(setDoc(doc(db, 'vouchers/stranger@example.com'), { title: 'x' }));
      await assertFails(updateDoc(doc(db, V_MAI), { revealedAt: serverTimestamp() }));
      await assertFails(deleteDoc(doc(db, V_MAI)));
      await assertFails(setDoc(doc(db, `${V_MAI}/items/new`), newItem));
      await assertFails(updateDoc(doc(db, `${V_MAI}/items/fresh`), stick(1)));
      await assertFails(setDoc(doc(db, `${V_MAI}/history/h2`), { title: 'x' }));
    });
  });
}

// ─────────────── Email trùng admin nhưng khác UID ───────────────
describe('Email trùng admin, khác UID — bị chặn mọi thao tác ghi', () => {
  const db = () => user('impostor-uid', ADMIN_EMAIL);
  it('không create/update/delete voucher', async () => {
    await assertFails(setDoc(doc(db(), 'vouchers/new@example.com'), { title: 'x' }));
    await assertFails(updateDoc(doc(db(), V_MAI), { title: 'x' }));
    await assertFails(updateDoc(doc(db(), V_MAI), { revealedAt: null }));
    await assertFails(deleteDoc(doc(db(), V_MAI)));
  });
  it('không create/update/delete item', async () => {
    await assertFails(setDoc(doc(db(), `${V_MAI}/items/new`), newItem));
    await assertFails(updateDoc(doc(db(), `${V_MAI}/items/fresh`), stick(1)));
    await assertFails(updateDoc(doc(db(), `${V_MAI}/items/stuck25h`), unstick));
    await assertFails(deleteDoc(doc(db(), `${V_MAI}/items/fresh`)));
  });
  it('không ghi history', async () => {
    await assertFails(setDoc(doc(db(), `${V_MAI}/history/h2`), { title: 'x' }));
    await assertFails(deleteDoc(doc(db(), `${V_MAI}/history/h1`)));
  });
});

// ───────────────────────── Collection lạ ─────────────────────────
describe('Collection lạ — bị chặn tất cả, kể cả admin', () => {
  for (const [label, getDb] of [
    ['admin', adminDb],
    ['owner', maiDb],
    ['chưa đăng nhập', anonDb],
  ] as const) {
    it(`${label} không đọc/ghi được secrets/*`, async () => {
      const db = getDb();
      await assertFails(getDoc(doc(db, 'secrets/x')));
      await assertFails(getDocs(collection(db, 'secrets')));
      await assertFails(setDoc(doc(db, 'secrets/y'), { a: 1 }));
      await assertFails(deleteDoc(doc(db, 'secrets/x')));
    });
  }
});
