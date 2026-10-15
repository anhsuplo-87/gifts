// FirestoreRepo — GiftRepo chạy trên Firebase thật hoặc emulator (task 004, SPEC §5–§7).
// Chỉ gửi đúng các field mà firestore.rules cho phép:
//   reveal → { revealedAt }   stick → { used, usedAt, slot }   peel → { used, usedAt, slot }
// Cập nhật lạc quan: Firestore phát snapshot cục bộ ngay khi ghi (serverTimestamp ước lượng),
// lỗi thì SDK tự hoàn lại và promise bị reject → UI báo lỗi.
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type FirestoreError,
  type Timestamp,
} from 'firebase/firestore';
import { adminUid } from '../config.ts';
import { firebase } from '../firebase.ts';
import { THEME_IDS, type ThemeId } from '../voucher/themes.ts';
import { DEFAULT_REVEAL_TEXT, type GiftRepo, type Item, type ViewState, type Voucher } from './types.ts';

const toDate = (v: unknown): Date | null => (v && typeof (v as Timestamp).toDate === 'function' ? (v as Timestamp).toDate() : null);

function toVoucher(email: string, d: DocumentData): Voucher {
  return {
    email,
    theme: (THEME_IDS as readonly string[]).includes(d.theme) ? (d.theme as ThemeId) : 'designer',
    title: String(d.title ?? ''),
    recipientName: String(d.recipientName ?? ''),
    giverName: String(d.giverName ?? 'Bá Lương'),
    message: String(d.message ?? ''),
    revealText: String(d.revealText || DEFAULT_REVEAL_TEXT),
    slots: Math.max(1, Math.min(10, Number(d.slots) || 1)),
    expiresAt: toDate(d.expiresAt),
    revealedAt: toDate(d.revealedAt),
  };
}

function toItem(id: string, d: DocumentData): Item {
  return {
    id,
    title: String(d.title ?? ''),
    description: String(d.description ?? ''),
    image: typeof d.image === 'string' ? d.image : null,
    order: Number(d.order) || 0,
    used: d.used === true,
    usedAt: toDate(d.usedAt),
    slot: typeof d.slot === 'number' ? d.slot : null,
  };
}

/** Câu thân thiện cho lỗi đăng nhập */
export function signInMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  if (code.includes('popup-blocked')) return 'Trình duyệt chặn cửa sổ đăng nhập. Cho phép popup rồi bấm lại nha.';
  if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) return 'Bạn đã đóng cửa sổ đăng nhập. Bấm lại khi sẵn sàng nha.';
  if (code.includes('network-request-failed')) return 'Mạng đang trục trặc, kiểm tra kết nối rồi thử lại nha.';
  return 'Chưa đăng nhập được, thử lại nha.';
}

function errorMessage(e: FirestoreError): string {
  if (e.code === 'permission-denied') return 'Không có quyền xem quà này (tài khoản chưa xác minh email, hoặc quà chưa mở).';
  if (e.code === 'unavailable') return 'Không kết nối được máy chủ.';
  return 'Không tải được quà.';
}

/** Lắng nghe voucher + items của một email → ViewState (dùng cho bạn bè và cho admin "xem như bạn bè") */
export function watchVoucherOf(email: string, cb: (s: ViewState) => void): () => void {
  const { db } = firebase();
  let voucher: Voucher | null | undefined; // undefined = chưa có snapshot
  let items: Item[] | undefined;
  let failed = false;
  const emit = () => {
    if (failed || voucher === undefined) return;
    if (voucher === null) return cb({ kind: 'noVoucher', email });
    if (items === undefined) return;
    cb({ kind: 'ready', email, voucher, items });
  };
  const fail = (e: FirestoreError) => {
    failed = true;
    cb({ kind: 'error', email, message: errorMessage(e) });
  };
  const opts = { serverTimestamps: 'estimate' as const };
  const unV = onSnapshot(
    doc(db, 'vouchers', email),
    (snap) => {
      voucher = snap.exists() ? toVoucher(email, snap.data(opts)) : null;
      emit();
    },
    fail,
  );
  const unI = onSnapshot(
    query(collection(db, 'vouchers', email, 'items'), orderBy('order')),
    (snap) => {
      items = snap.docs.map((d) => toItem(d.id, d.data(opts)));
      emit();
    },
    (e) => {
      // voucher chưa có thì đọc items cũng bị chặn — không coi là lỗi
      if (voucher === null) return;
      fail(e);
    },
  );
  return () => {
    unV();
    unI();
  };
}

export class FirestoreRepo implements GiftRepo {
  private user: User | null = null;
  private email = '';
  private listeners = new Set<(s: ViewState) => void>();
  private state: ViewState = { kind: 'loading' };
  private stopData: (() => void) | null = null;
  private stopAuth: (() => void) | null = null;

  private emit(s: ViewState) {
    this.state = s;
    this.listeners.forEach((cb) => cb(s));
  }

  private start() {
    const { auth } = firebase();
    this.stopAuth = onAuthStateChanged(auth, (u) => this.onUser(u));
  }

  private onUser(u: User | null) {
    this.stopData?.();
    this.stopData = null;
    this.user = u;
    if (!u) return this.emit({ kind: 'signedOut' });
    this.email = (u.email ?? '').toLowerCase();
    if (u.uid === adminUid()) return this.emit({ kind: 'admin', email: this.email, uid: u.uid });
    if (!this.email) return this.emit({ kind: 'error', message: 'Tài khoản không có email.' });
    this.emit({ kind: 'loading' });
    this.stopData = watchVoucherOf(this.email, (s) => this.emit(s));
  }

  watchVoucher(cb: (s: ViewState) => void) {
    this.listeners.add(cb);
    cb(this.state);
    if (!this.stopAuth) this.start();
    return () => {
      this.listeners.delete(cb);
      if (!this.listeners.size) {
        this.stopData?.();
        this.stopAuth?.();
        this.stopData = this.stopAuth = null;
      }
    };
  }

  async signIn() {
    const { auth, emulator } = firebase();
    // Emulator: ?as=<email> đăng nhập thẳng bằng token Google giả (không cần popup) — chỉ để test
    const as = new URLSearchParams(location.search).get('as');
    if (emulator && as) {
      const sub = `sub-${as.toLowerCase()}`;
      await signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub, email: as, email_verified: true })));
      return;
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  }

  async signOut() {
    await fbSignOut(firebase().auth);
  }

  private voucherRef() {
    if (!this.user || !this.email) throw new Error('Chưa đăng nhập.');
    return doc(firebase().db, 'vouchers', this.email);
  }
  private itemRef(id: string) {
    return doc(this.voucherRef(), 'items', id);
  }

  async reveal() {
    await updateDoc(this.voucherRef(), { revealedAt: serverTimestamp() });
  }

  async stick(itemId: string, slot: number) {
    await updateDoc(this.itemRef(itemId), { used: true, usedAt: serverTimestamp(), slot });
  }

  async peel(itemId: string) {
    await updateDoc(this.itemRef(itemId), { used: false, usedAt: null, slot: null });
  }

  retry() {
    this.onUser(this.user);
  }
}

/** Repo chỉ đọc cho admin "Xem như bạn bè": mọi thao tác ghi đều bị từ chối */
export class PreviewRepo implements GiftRepo {
  constructor(private email: string) {}
  watchVoucher(cb: (s: ViewState) => void) {
    cb({ kind: 'loading' });
    return watchVoucherOf(this.email, (s) =>
      // xem thử: luôn hiện voucher (bỏ qua màn tiết lộ)
      cb(s.kind === 'ready' && !s.voucher.revealedAt ? { ...s, voucher: { ...s.voucher, revealedAt: new Date(0) } } : s),
    );
  }
  private ro(): Promise<void> {
    return Promise.reject(new Error('Đang xem thử — chỉ đọc.'));
  }
  signIn() {
    return this.ro();
  }
  signOut() {
    return this.ro();
  }
  reveal() {
    return this.ro();
  }
  stick() {
    return this.ro();
  }
  peel() {
    return this.ro();
  }
  retry() {}
}
