// Lớp dữ liệu cho admin (task 005, SPEC §2.2, §5). Admin được rules cho ghi mọi field, nhưng
// vẫn luôn ghi ĐỦ field để phía bạn bè chạy đúng rules:
//   - voucher mới: revealedAt = null (validReveal cần field có thật), bgSeed, giverName, revealText, slots, expiresAt…
//   - sticker mới: used = false, usedAt = null, slot = null, order = lớn nhất + 1.
// Chỉ được import từ src/admin/** (chunk admin tải riêng).
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type FirestoreError,
} from 'firebase/firestore';
import { firebase } from '../firebase.ts';
import { toDate, toItem, toVoucher } from './firestore.ts';
import { DEFAULT_REVEAL_TEXT, groupKey, type Item, type Voucher } from './types.ts';
import type { ThemeId } from '../voucher/themes.ts';

export const GIVER_DEFAULT = 'Bá Lương';
export const MAX_SLOTS = 10;
export const MAX_COPIES = 10;

export type AdminVoucher = Voucher & { bgSeed: string; createdAt: Date | null; updatedAt: Date | null };

/** Dữ liệu form voucher (những field admin sửa được) */
export type VoucherInput = {
  theme: ThemeId;
  title: string;
  recipientName: string;
  giverName: string;
  message: string;
  revealText: string;
  slots: number;
  expiresAt: Date | null;
  bgSeed: string;
};

export type StickerInput = { title: string; description: string; image: string | null; count: number };

/** Một nhóm sticker (các bản sao cùng group), sắp theo order nhỏ nhất */
export type StickerGroup = { key: string; title: string; description: string; image: string | null; order: number; copies: Item[]; used: number };

export type RecentStick = { email: string; item: Item };

const db = () => firebase().db;
const vRef = (email: string) => doc(db(), 'vouchers', email);
const itemsCol = (email: string) => collection(db(), 'vouchers', email, 'items');

// ───────── Tiện ích ─────────

export const normalizeEmail = (s: string) => s.trim().toLowerCase();
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/** Hash ngắn (FNV-1a, base36) — bgSeed mặc định lấy từ email */
export function shortHash(s: string): string {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(36).padStart(7, '0').slice(0, 7);
}
export const randomSeed = () => Math.random().toString(36).slice(2, 9).padEnd(7, '0');
const newGroupId = () => Math.random().toString(36).slice(2, 8);

export function defaultInput(email = ''): VoucherInput {
  return {
    theme: 'designer',
    title: '',
    recipientName: '',
    giverName: GIVER_DEFAULT,
    message: '',
    revealText: DEFAULT_REVEAL_TEXT,
    slots: 4,
    expiresAt: null,
    bgSeed: email ? shortHash(email) : '',
  };
}

function toAdminVoucher(email: string, d: DocumentData): AdminVoucher {
  return {
    ...toVoucher(email, d),
    bgSeed: typeof d.bgSeed === 'string' && d.bgSeed ? d.bgSeed : shortHash(email),
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  };
}

const clampSlots = (n: number) => Math.max(1, Math.min(MAX_SLOTS, Math.round(n) || 1));

function voucherFields(v: VoucherInput) {
  return {
    theme: v.theme,
    title: v.title.trim(),
    recipientName: v.recipientName.trim(),
    giverName: v.giverName.trim() || GIVER_DEFAULT,
    message: v.message.trim(),
    revealText: v.revealText.trim() || DEFAULT_REVEAL_TEXT,
    slots: clampSlots(v.slots),
    expiresAt: v.expiresAt ? Timestamp.fromDate(v.expiresAt) : null,
    bgSeed: v.bgSeed.trim(),
  };
}

/** Lỗi ghi → câu dễ hiểu */
export function writeError(e: unknown): string {
  const code = (e as FirestoreError)?.code ?? '';
  if (code === 'permission-denied') return 'Không có quyền ghi (tài khoản không phải admin, hoặc rules chưa deploy).';
  if (code === 'unavailable') return 'Mất kết nối máy chủ — kiểm tra mạng rồi thử lại.';
  if (code === 'resource-exhausted') return 'Dữ liệu quá lớn hoặc vượt hạn mức.';
  if (e instanceof Error && e.message) return e.message;
  return 'Có lỗi khi ghi dữ liệu.';
}

/** Gộp items thành nhóm (theo group, không có thì mỗi item một nhóm), sắp theo order nhỏ nhất */
export function groupItems(items: Item[]): StickerGroup[] {
  const map = new Map<string, Item[]>();
  for (const it of [...items].sort((a, b) => a.order - b.order)) {
    const k = groupKey(it);
    map.set(k, [...(map.get(k) ?? []), it]);
  }
  return [...map.entries()].map(([key, copies]) => ({
    key,
    title: copies[0].title,
    description: copies[0].description,
    image: copies[0].image,
    order: copies[0].order,
    copies,
    used: copies.filter((c) => c.used).length,
  }));
}

// ───────── Đọc (onSnapshot) ─────────

const opts = { serverTimestamps: 'estimate' as const };

/** Tất cả voucher + mọi item (collection group) → để đếm đã dán */
export function watchAll(
  cb: (s: { vouchers: AdminVoucher[]; items: Map<string, Item[]> }) => void,
  onError: (msg: string) => void,
): () => void {
  let vouchers: AdminVoucher[] | undefined;
  let items: Map<string, Item[]> | undefined;
  const emit = () => vouchers && items && cb({ vouchers, items });
  const fail = (e: FirestoreError) => onError(e.code === 'permission-denied' ? 'Không có quyền đọc (cần đăng nhập admin).' : 'Không tải được dữ liệu.');
  const unV = onSnapshot(
    collection(db(), 'vouchers'),
    (snap) => {
      vouchers = snap.docs.map((d) => toAdminVoucher(d.id, d.data(opts))).sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      emit();
    },
    fail,
  );
  const unI = onSnapshot(
    collectionGroup(db(), 'items'),
    (snap) => {
      const m = new Map<string, Item[]>();
      for (const d of snap.docs) {
        const email = d.ref.parent.parent?.id;
        if (!email) continue;
        m.set(email, [...(m.get(email) ?? []), toItem(d.id, d.data(opts))]);
      }
      items = m;
      emit();
    },
    fail,
  );
  return () => {
    unV();
    unI();
  };
}

/** "Mới dán": collectionGroup items, used == true, mới nhất trước (index trong firestore.indexes.json) */
export function watchRecent(cb: (r: RecentStick[]) => void, onError: (msg: string) => void, n = 20): () => void {
  return onSnapshot(
    query(collectionGroup(db(), 'items'), where('used', '==', true), orderBy('usedAt', 'desc'), limit(n)),
    (snap) => cb(snap.docs.map((d) => ({ email: d.ref.parent.parent?.id ?? '?', item: toItem(d.id, d.data(opts)) }))),
    (e) => onError(e.code === 'failed-precondition' ? 'Index cho "Mới dán" chưa sẵn sàng — nếu vừa deploy thì Firebase đang tạo, đợi vài phút rồi tải lại trang.' : 'Không tải được "Mới dán".'),
  );
}

/** Một voucher (null = chưa có) + items của nó */
export function watchOne(
  email: string,
  cb: (s: { voucher: AdminVoucher | null; items: Item[] }) => void,
  onError: (msg: string) => void,
): () => void {
  let voucher: AdminVoucher | null | undefined;
  let items: Item[] | undefined;
  const emit = () => voucher !== undefined && items && cb({ voucher, items });
  const fail = () => onError('Không tải được voucher.');
  const unV = onSnapshot(
    vRef(email),
    (snap) => {
      voucher = snap.exists() ? toAdminVoucher(email, snap.data(opts)) : null;
      emit();
    },
    fail,
  );
  const unI = onSnapshot(
    query(itemsCol(email), orderBy('order')),
    (snap) => {
      items = snap.docs.map((d) => toItem(d.id, d.data(opts)));
      emit();
    },
    fail,
  );
  return () => {
    unV();
    unI();
  };
}

// ───────── Ghi voucher ─────────

/** Tạo voucher; báo lỗi nếu email đã có voucher */
export async function createVoucher(rawEmail: string, v: VoucherInput): Promise<string> {
  const email = normalizeEmail(rawEmail);
  if (!isEmail(email)) throw new Error('Email không hợp lệ.');
  await runTransaction(db(), async (tx) => {
    const snap = await tx.get(vRef(email));
    if (snap.exists()) throw new Error(`Email ${email} đã có voucher rồi.`);
    tx.set(vRef(email), {
      ...voucherFields(v),
      bgSeed: v.bgSeed.trim() || shortHash(email),
      revealedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  return email;
}

export async function updateVoucher(email: string, v: VoucherInput) {
  await updateDoc(vRef(email), { ...voucherFields(v), bgSeed: v.bgSeed.trim() || shortHash(email), updatedAt: serverTimestamp() });
}

/** Reset tiết lộ: đặt revealedAt = null (không xoá field — rules validReveal cần nó) */
export async function resetReveal(email: string) {
  await updateDoc(vRef(email), { revealedAt: null, updatedAt: serverTimestamp() });
}

/** Xoá voucher: xoá items + history trước rồi mới xoá doc */
export async function deleteVoucher(email: string) {
  for (const sub of ['items', 'history']) {
    const snap = await getDocs(collection(db(), 'vouchers', email, sub));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const b = writeBatch(db());
      snap.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
      await b.commit();
    }
  }
  await deleteDoc(vRef(email));
}

// ───────── Ghi sticker ─────────

/**
 * Tạo / sửa một nhóm sticker.
 * - Tên, mô tả, ảnh áp dụng cho mọi bản sao trong nhóm.
 * - count tăng → sinh thêm bản sao (order = lớn nhất + 1…); count giảm → chỉ xoá bản CHƯA dán.
 * group null = nhóm mới.
 */
export async function saveStickerGroup(email: string, group: StickerGroup | null, input: StickerInput, allItems: Item[]) {
  const count = Math.max(1, Math.min(MAX_COPIES, Math.round(input.count) || 1));
  const title = input.title.trim();
  if (!title) throw new Error('Sticker cần có tên.');
  const copies = group?.copies ?? [];
  // nhóm có nhiều bản sao thì cần group id chung; item cũ không có group → lấy id của nó
  const gid = copies.find((c) => c.group)?.group ?? (copies[0]?.id || newGroupId());
  const common = { title, description: input.description.trim(), image: input.image, group: gid };
  const b = writeBatch(db());
  for (const c of copies) b.update(doc(itemsCol(email), c.id), { ...common, updatedAt: serverTimestamp() });

  if (count > copies.length) {
    let order = Math.max(-1, ...allItems.map((i) => i.order));
    for (let i = copies.length; i < count; i++) {
      b.set(doc(itemsCol(email)), {
        ...common,
        order: ++order,
        used: false,
        usedAt: null,
        slot: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } else if (count < copies.length) {
    const removable = copies.filter((c) => !c.used).sort((a, b) => b.order - a.order);
    const need = copies.length - count;
    if (removable.length < need) throw new Error(`Chỉ giảm được còn ${copies.length - removable.length} (các bản đã dán không xoá được — bóc ra trước).`);
    removable.slice(0, need).forEach((c) => b.delete(doc(itemsCol(email), c.id)));
  }
  await b.commit();
}

/** Xoá cả nhóm (mọi bản sao) */
export async function deleteStickerGroup(email: string, group: StickerGroup) {
  const b = writeBatch(db());
  group.copies.forEach((c) => b.delete(doc(itemsCol(email), c.id)));
  await b.commit();
}

/** Đổi chỗ nhóm i với nhóm i+dir; đánh số lại order liên tục cho mọi bản sao (chỉ ghi item đổi số) */
export async function moveStickerGroup(email: string, groups: StickerGroup[], i: number, dir: -1 | 1) {
  const j = i + dir;
  if (j < 0 || j >= groups.length) return;
  const next = [...groups];
  [next[i], next[j]] = [next[j], next[i]];
  const b = writeBatch(db());
  let order = 0;
  let writes = 0;
  for (const g of next)
    for (const c of g.copies) {
      if (c.order !== order) {
        b.update(doc(itemsCol(email), c.id), { order, updatedAt: serverTimestamp() });
        writes++;
      }
      order++;
    }
  if (writes) await b.commit();
}

/** Admin dán thay bạn bè */
export async function adminStick(email: string, itemId: string, slot: number) {
  await updateDoc(doc(itemsCol(email), itemId), { used: true, usedAt: serverTimestamp(), slot });
}

/** Admin bóc bất kỳ lúc nào */
export async function adminPeel(email: string, itemId: string) {
  await updateDoc(doc(itemsCol(email), itemId), { used: false, usedAt: null, slot: null });
}
