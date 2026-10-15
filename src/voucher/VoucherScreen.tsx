// Màn voucher của bạn bè: tiết lộ → voucher + bảng sticker + lời nhắn; dán / bóc sticker (SPEC §2.1, §4).
import { useEffect, useRef, useState } from 'preact/hooks';
import { canPeel, PEEL_WINDOW_MS, type GiftRepo, type Item, type Voucher } from '../data/types.ts';
import { Button, Dialog, Toast } from '../ui/Kit.tsx';
import { useReducedMotion } from '../ui/hooks.ts';
import { LAYOUTS, TRAY_MIN_CSS, layoutFor } from './layout.ts';
import { RevealOverlay } from './Reveal.tsx';
import { StickerImg } from './Sticker.tsx';
import { VoucherCard, type Face } from './Voucher.tsx';

const FLIP_HALF = 150; // ms mỗi nửa cú lật (tổng ~300ms)
const fmtTime = (d: Date) =>
  d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDate = (d: Date) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function VoucherScreen({ repo, voucher, items }: { repo: GiftRepo; voucher: Voucher; items: Item[] }) {
  const reducedMotion = useReducedMotion();
  const [face, setFace] = useState<Face>('front');
  const [flipPhase, setFlipPhase] = useState<'out' | 'in' | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ item: Item; slot: number } | null>(null);
  const [detail, setDetail] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [popped, setPopped] = useState<string | null>(null);
  const [dropped, setDropped] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const kind = layoutFor(voucher.slots);
  const unused = items.filter((i) => !i.used).sort((a, b) => a.order - b.order);
  const usedCount = items.filter((i) => i.used).length;
  const full = usedCount >= voucher.slots;
  const selectedItem = unused.find((i) => i.id === selected) ?? null;

  // sticker đã chọn mà bị dán / mất thì bỏ chọn
  useEffect(() => {
    if (selected && !selectedItem) setSelected(null);
  }, [selected, selectedItem]);

  const flipTo = (target: Face) => {
    if (target === face || flipPhase) return;
    if (reducedMotion) return setFace(target);
    setFlipPhase('out');
    later(() => {
      setFace(target);
      setFlipPhase('in');
      later(() => setFlipPhase(null), FLIP_HALF);
    }, FLIP_HALF);
  };
  const flip = () => flipTo(face === 'front' ? 'back' : 'front');

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      return true;
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Có lỗi, thử lại nha.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  // ───────── Tiết lộ ─────────
  if (!voucher.revealedAt) {
    const start = () => {
      if (revealing) return;
      if (reducedMotion) return void run(() => repo.reveal());
      setRevealing(true);
    };
    return (
      <main class="voucher-screen">
        <VoucherCard
          voucher={voucher}
          items={items}
          face="front"
          flipPhase={null}
          reducedMotion={reducedMotion}
          picking={false}
          poppedId={null}
          onTap={start}
          onCell={() => {}}
          onStuck={() => {}}
          interactive
          overlay={
            <RevealOverlay
              go={revealing}
              onDone={async () => {
                const ok = await run(() => repo.reveal());
                if (!ok) setRevealing(false);
              }}
            />
          }
        />
        <button type="button" class="reveal-cta" onClick={start} disabled={revealing || busy}>
          {voucher.revealText}
        </button>
        {toast && <Toast text={toast} onDone={() => setToast(null)} />}
      </main>
    );
  }

  // ───────── Voucher ─────────
  const pick = (it: Item) => {
    if (full) return;
    if (selected === it.id) return setSelected(null);
    setSelected(it.id);
    if (face === 'front') flipTo('back');
  };

  const onCell = (slot: number) => {
    if (!selectedItem) {
      setToast(full ? 'Đã dán đủ ô rồi nè.' : 'Chọn một sticker ở bảng bên dưới trước nha.');
      return;
    }
    setConfirm({ item: selectedItem, slot });
  };

  const doStick = async () => {
    if (!confirm) return;
    const { item, slot } = confirm;
    const ok = await run(() => repo.stick(item.id, slot));
    setConfirm(null);
    if (ok) {
      setSelected(null);
      if (!reducedMotion) {
        setPopped(item.id);
        later(() => setPopped(null), 600);
      }
    }
  };

  const doPeel = async () => {
    if (!detail) return;
    const id = detail.id;
    const ok = await run(() => repo.peel(id));
    setDetail(null);
    if (ok && !reducedMotion) {
      setDropped(id);
      later(() => setDropped(null), 600);
    }
  };

  const L = LAYOUTS[kind];
  const trayScale = Math.max(1, Math.ceil(TRAY_MIN_CSS / L.sticker));
  const traySize = L.sticker * trayScale;
  const expired = voucher.expiresAt && voucher.expiresAt.getTime() < Date.now();

  return (
    <main class="voucher-screen">
      <VoucherCard
        voucher={voucher}
        items={items}
        face={face}
        flipPhase={flipPhase}
        reducedMotion={reducedMotion}
        picking={!!selectedItem && face === 'back'}
        poppedId={popped}
        onTap={flip}
        onCell={onCell}
        onStuck={(it) => setDetail(it)}
      />

      <div class="voucher-actions">
        <Button variant="secondary" small icon="iconFlip" onClick={flip} label={face === 'front' ? 'Lật sang mặt sau' : 'Lật sang mặt trước'}>
          Lật
        </Button>
      </div>

      <section class={`tray frame-tray${full ? ' tray--full' : ''}`} aria-label="Bảng sticker">
        {full ? (
          <p class="pt tray__done">{kind === 'single' ? 'Đã chọn xong món quà 🎉' : 'Đã dán đủ ô 🎉'}</p>
        ) : unused.length === 0 ? (
          <p class="pt tray__done">Hết sticker rồi</p>
        ) : (
          <p class="tray__hint">{selectedItem ? 'Giờ chạm vào một ô trống trên voucher' : 'Chạm một sticker để xem, rồi chạm ô trống để dán'}</p>
        )}
        <ul class="tray__list" role="list">
          {unused.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                class={`tray__item${it.id === selected ? ' is-selected' : ''}${it.id === dropped ? ' drop-in' : ''}`}
                style={{ width: `${traySize + 16}px`, height: `${traySize + 16}px` }}
                aria-pressed={it.id === selected}
                aria-label={`${it.title}${it.id === selected ? ' (đang chọn)' : ''}`}
                disabled={full}
                onClick={() => pick(it)}
              >
                <StickerImg item={it} theme={voucher.theme} kind={kind} box={traySize} unit="px" />
              </button>
            </li>
          ))}
        </ul>
        {selectedItem && (
          <div class="tray__info" aria-live="polite">
            <p class="pt">{selectedItem.title}</p>
            <p>{selectedItem.description}</p>
          </div>
        )}
      </section>

      <article class="note frame-tray">
        <p>{voucher.message}</p>
        <p class="note__sign">— {voucher.giverName}</p>
        {voucher.expiresAt && (
          <p class="note__exp">{expired ? 'Đã quá hạn, nhưng Bá Lương dễ tính 😉' : `Hạn dùng: ${fmtDate(voucher.expiresAt)}`}</p>
        )}
      </article>

      {confirm && (
        <Dialog
          labelId="dlg-stick"
          onClose={() => !busy && setConfirm(null)}
          title={
            <>
              Dán <span class="hl">{confirm.item.title}</span>?
            </>
          }
          actions={
            <>
              <Button icon="iconCheck" onClick={doStick} disabled={busy}>
                {busy ? 'Đang dán…' : 'Dán luôn'}
              </Button>
              <Button variant="secondary" icon="iconClose" onClick={() => setConfirm(null)} disabled={busy}>
                Thôi
              </Button>
            </>
          }
        >
          {kind === 'single' && <p class="warn-strong">Chỉ chọn được 1 lần thôi đó!</p>}
          <p>Bá Lương sẽ thấy ngay. Lỡ tay thì bóc ra được trong 24 giờ.</p>
        </Dialog>
      )}

      {detail && (
        <Dialog
          labelId="dlg-detail"
          onClose={() => !busy && setDetail(null)}
          title={detail.title}
          actions={
            <>
              {canPeel(detail) && (
                <Button icon="iconPeel" onClick={doPeel} disabled={busy}>
                  {busy ? 'Đang bóc…' : 'Bóc ra'}
                </Button>
              )}
              <Button variant="secondary" icon="iconClose" onClick={() => setDetail(null)} disabled={busy}>
                Đóng
              </Button>
            </>
          }
        >
          <div class="detail">
            <StickerImg item={detail} theme={voucher.theme} kind={kind} box={L.sticker * 2} unit="px" />
            <div>
              <p>{detail.description}</p>
              {detail.usedAt && <p class="muted">Dán lúc {fmtTime(detail.usedAt)}</p>}
              <p class="muted">
                {canPeel(detail)
                  ? `Còn bóc ra được trong khoảng ${Math.max(1, Math.ceil((detail.usedAt!.getTime() + PEEL_WINDOW_MS - Date.now()) / 3600000))} giờ nữa.`
                  : 'Đã quá 24 giờ nên không bóc ra được nữa.'}
              </p>
            </div>
          </div>
        </Dialog>
      )}

      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
    </main>
  );
}
