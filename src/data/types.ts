// Kiểu dữ liệu phía client (SPEC §5) + interface lớp dữ liệu GiftRepo (SPEC §7).
import type { ThemeId } from '../voucher/themes.ts';

export type Voucher = {
  email: string;
  theme: ThemeId;
  title: string;
  recipientName: string;
  giverName: string;
  message: string;
  revealText: string;
  slots: number;
  expiresAt: Date | null;
  revealedAt: Date | null;
};

export type Item = {
  id: string;
  title: string;
  description: string;
  image: string | null;
  order: number;
  used: boolean;
  usedAt: Date | null;
  slot: number | null;
};

export type ViewState =
  | { kind: 'loading' }
  | { kind: 'signedOut' }
  | { kind: 'noVoucher'; email: string }
  | { kind: 'error'; message: string; email?: string }
  | { kind: 'ready'; email: string; voucher: Voucher; items: Item[] }
  /** Đăng nhập bằng UID admin → #/admin */
  | { kind: 'admin'; email: string; uid: string };

export interface GiftRepo {
  /** Theo dõi trạng thái (đăng nhập + voucher + items). Trả về hàm huỷ. */
  watchVoucher(cb: (s: ViewState) => void): () => void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  /** Đánh dấu đã tiết lộ (revealedAt = giờ server) */
  reveal(): Promise<void>;
  stick(itemId: string, slot: number): Promise<void>;
  peel(itemId: string): Promise<void>;
  /** Thử tải lại sau lỗi */
  retry(): void;
}

/** Bóc được trong 24 giờ sau khi dán (khớp firestore.rules) */
export const PEEL_WINDOW_MS = 24 * 3600 * 1000;
export const canPeel = (item: Item, now = Date.now()) =>
  item.used && item.usedAt !== null && now < item.usedAt.getTime() + PEEL_WINDOW_MS;

export const DEFAULT_REVEAL_TEXT = 'Chúc mừng sinh nhật — chạm để tiết lộ';
