// MockRepo — dữ liệu giả trong bộ nhớ cho prototype (task 003). Chọn chế độ bằng ?mock=…
// Dữ liệu chung chung, không có tên/email thật.
import { DEFAULT_REVEAL_TEXT, canPeel, type GiftRepo, type Item, type ViewState, type Voucher } from './types.ts';

export const MOCK_MODES = [
  'login',
  'inapp',
  'reveal',
  'designer',
  'designer-full',
  'gamer',
  'gamer-done',
  'empty',
  'error',
  'flaky',
] as const;
export type MockMode = (typeof MOCK_MODES)[number];

export const MOCK_LABELS: Record<MockMode, string> = {
  login: 'Đăng nhập',
  inapp: 'Trình duyệt trong app',
  reveal: 'Tiết lộ',
  designer: 'Designer (8 ô)',
  'designer-full': 'Designer đủ ô',
  gamer: 'Gamer (1 ô)',
  'gamer-done': 'Gamer đã chọn',
  empty: 'Chưa có quà',
  error: 'Lỗi',
  flaky: 'Mạng chập chờn',
};

export function readMockMode(search = location.search): MockMode {
  const v = new URLSearchParams(search).get('mock');
  return (MOCK_MODES as readonly string[]).includes(v ?? '') ? (v as MockMode) : 'login';
}

const EMAIL = 'ban.thu.nghiem@example.com';
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(Date.now() - ms);

const DESIGNER_ITEMS: Array<[string, string]> = [
  ['Mua font khẩn cấp', 'Một bộ font bạn thèm từ lâu, mua liền không cần nghĩ.'],
  ['Cà phê cứu deadline', 'Một ly cà phê to nhất quán, giao tận bàn lúc 2 giờ sáng.'],
  ['Một tháng subscription', 'Một tháng phần mềm/công cụ bạn đang cần.'],
  ['Gói mockup', 'Một gói mockup xịn để khoe tác phẩm.'],
  ['Lẩu đổi brief lần 5', 'Một bữa lẩu an ủi khi khách đổi brief lần thứ năm.'],
  ['Khoá học online', 'Một khoá học online bạn chọn.'],
  ['Sổ phác thảo xịn', 'Một cuốn sổ giấy dày, vẽ gì cũng đẹp.'],
  ['Vé triển lãm', 'Một buổi đi xem triển lãm, có người đi cùng.'],
];

function makeItems(list: Array<[string, string]>, used: Array<[number, number, number]>): Item[] {
  // used: [index item, slot, cách đây bao lâu (ms)]
  return list.map(([title, description], i) => {
    const u = used.find(([idx]) => idx === i);
    return {
      id: `item-${i + 1}`,
      title,
      description,
      image: null,
      order: i,
      used: !!u,
      usedAt: u ? ago(u[2]) : null,
      slot: u ? u[1] : null,
    };
  });
}

const baseVoucher = (patch: Partial<Voucher>): Voucher => ({
  email: EMAIL,
  theme: 'designer',
  title: 'Hỗ trợ dân Design',
  recipientName: 'Bạn Thử Nghiệm',
  giverName: 'Bá Lương',
  message:
    'Chúc bạn tuổi mới nhiều cảm hứng, ít deadline! Mỗi sticker là một món quà nhỏ — dán vào ô nào là mình biết liền để chuẩn bị.',
  revealText: DEFAULT_REVEAL_TEXT,
  slots: 8,
  expiresAt: new Date(Date.now() + 120 * DAY),
  revealedAt: ago(2 * DAY),
  ...patch,
});

const GAMER_VOUCHER = (revealed = true) =>
  baseVoucher({
    theme: 'gamer',
    title: 'Săn game cùng Bá Lương',
    slots: 1,
    expiresAt: null,
    revealedAt: revealed ? ago(DAY) : null,
    message: 'Một game, chọn kỹ nha! Chọn xong mình mua tặng liền, rồi rủ nhau chơi chung.',
  });

const GAMER_ITEMS = Array.from({ length: 6 }, (_, i) => [`Game bí ẩn #${i + 1}`, `Một tựa game bí mật số ${i + 1}. Chọn đi rồi biết!`] as [string, string]);

function dataFor(mode: MockMode): { voucher: Voucher; items: Item[] } | null {
  switch (mode) {
    case 'reveal':
      return { voucher: baseVoucher({ revealedAt: null }), items: makeItems(DESIGNER_ITEMS.slice(0, 6), []) };
    case 'designer':
    case 'flaky':
      return {
        voucher: baseVoucher({}),
        items: makeItems(DESIGNER_ITEMS.slice(0, 6), [
          [1, 0, 3 * DAY],
          [3, 2, 1 * HOUR],
        ]),
      };
    case 'designer-full':
      return {
        voucher: baseVoucher({ expiresAt: ago(5 * DAY) }),
        items: makeItems(DESIGNER_ITEMS, [
          [0, 0, 9 * DAY],
          [1, 1, 8 * DAY],
          [2, 2, 6 * DAY],
          [3, 3, 5 * DAY],
          [4, 4, 4 * DAY],
          [5, 5, 3 * DAY],
          [6, 6, 2 * DAY],
          [7, 7, 2 * HOUR],
        ]),
      };
    case 'gamer':
      return { voucher: GAMER_VOUCHER(), items: makeItems(GAMER_ITEMS, []) };
    case 'gamer-done':
      return { voucher: GAMER_VOUCHER(), items: makeItems(GAMER_ITEMS, [[2, 0, 2 * DAY]]) };
    default:
      return null;
  }
}

const DELAY = 300;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class MockRepo implements GiftRepo {
  private mode: MockMode;
  private data: { voucher: Voucher; items: Item[] } | null;
  private listeners = new Set<(s: ViewState) => void>();
  private state: ViewState = { kind: 'loading' };

  constructor(mode: MockMode) {
    this.mode = mode;
    this.data = dataFor(mode);
  }

  private emit(s: ViewState) {
    this.state = s;
    for (const cb of this.listeners) cb(s);
  }

  private snapshot(): ViewState {
    switch (this.mode) {
      case 'login':
      case 'inapp':
        return { kind: 'signedOut' };
      case 'empty':
        return { kind: 'noVoucher', email: EMAIL };
      case 'error':
        return { kind: 'error', email: EMAIL, message: 'Không tải được quà (lỗi giả của chế độ ?mock=error).' };
      default:
        return {
          kind: 'ready',
          email: EMAIL,
          voucher: { ...this.data!.voucher },
          items: this.data!.items.map((i) => ({ ...i })),
        };
    }
  }

  private async load() {
    this.emit({ kind: 'loading' });
    await sleep(DELAY);
    this.emit(this.snapshot());
  }

  /** Lỗi giả khi ?mock=flaky: khoảng 1/3 thao tác thất bại */
  private async network() {
    await sleep(DELAY);
    if (this.mode === 'flaky' && Math.random() < 0.35) throw new Error('Mạng chập chờn, thử lại nha.');
  }

  private setMode(mode: MockMode) {
    this.mode = mode;
    this.data = dataFor(mode);
    const url = new URL(location.href);
    url.searchParams.set('mock', mode);
    history.replaceState(null, '', url);
  }

  watchVoucher(cb: (s: ViewState) => void) {
    this.listeners.add(cb);
    cb(this.state);
    if (this.state.kind === 'loading') void this.load();
    return () => void this.listeners.delete(cb);
  }

  async signIn() {
    await this.network();
    this.setMode('reveal');
    await this.load();
  }

  async signOut() {
    await sleep(DELAY);
    this.setMode('login');
    this.emit({ kind: 'signedOut' });
  }

  async reveal() {
    await this.network();
    if (!this.data || this.data.voucher.revealedAt) return;
    this.data.voucher.revealedAt = new Date();
    this.emit(this.snapshot());
  }

  async stick(itemId: string, slot: number) {
    await this.network();
    const d = this.data;
    if (!d) throw new Error('Chưa có voucher.');
    const item = d.items.find((i) => i.id === itemId);
    if (!item) throw new Error('Không tìm thấy sticker.');
    if (item.used) throw new Error('Sticker này đã dán rồi.');
    if (slot < 0 || slot >= d.voucher.slots) throw new Error('Ô không hợp lệ.');
    if (d.items.some((i) => i.used && i.slot === slot)) throw new Error('Ô này đã có sticker.');
    if (d.items.filter((i) => i.used).length >= d.voucher.slots) throw new Error('Đã dán đủ ô rồi.');
    Object.assign(item, { used: true, usedAt: new Date(), slot });
    this.emit(this.snapshot());
  }

  async peel(itemId: string) {
    await this.network();
    const item = this.data?.items.find((i) => i.id === itemId);
    if (!item || !item.used) throw new Error('Sticker chưa được dán.');
    if (!canPeel(item)) throw new Error('Đã quá 24 giờ, không bóc ra được nữa.');
    Object.assign(item, { used: false, usedAt: null, slot: null });
    this.emit(this.snapshot());
  }

  retry() {
    void this.load();
  }
}
