// Màn voucher của bạn bè (SPEC §2.1 — bố cục 2 phần):
//   Phần trên = 1 màn hình: thẻ ở giữa + chữ phụ "Chạm thẻ để lật" + bảng sticker + dòng mô tả cố định.
//   Phần dưới: thẻ lời chúc → danh sách "Đã dán".
// Tiết lộ dùng cùng khung. Chọn sticker → chế độ tập trung.
import { useEffect, useRef, useState } from 'preact/hooks';
import { canPeel, groupKey, PEEL_WINDOW_MS, type GiftRepo, type Item, type Voucher } from '../data/types.ts';
import { Button, Dialog, IconButton, Toast } from '../ui/Kit.tsx';
import { useReducedMotion } from '../ui/hooks.ts';
import { commonImg } from '../ui/tokens.ts';
import { LAYOUTS, TRAY_MIN_CSS, layoutFor } from './layout.ts';
import { RevealOverlay } from './Reveal.tsx';
import { StickerImg } from './Sticker.tsx';
import { requestTiltPermission } from './tilt.ts';
import { VoucherCard, type Face } from './Voucher.tsx';

/** Rung nhẹ (Android; iOS bỏ qua) */
const buzz = (ms: number) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* không hỗ trợ */
  }
};
const fmtTime = (d: Date) =>
  d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDate = (d: Date) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDayMonth = (d: Date) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

/** Mũi tên gợi ý cuộn xuống phần dưới */
function ScrollHint({ target }: { target: () => HTMLElement | null }) {
  return (
    <button type="button" class="scroll-hint" aria-label="Cuộn xuống xem lời chúc" onClick={() => target()?.scrollIntoView({ behavior: 'smooth' })}>
      <img src={commonImg('iconScroll')} alt="" />
    </button>
  );
}

export function VoucherScreen({ repo, voucher, items }: { repo: GiftRepo; voucher: Voucher; items: Item[] }) {
  const reducedMotion = useReducedMotion();
  const stageWrap = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLElement>(null);
  const [face, setFace] = useState<Face>('front');
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
  // Đã tiết lộ xong → hạ cờ, để khi admin reset tiết lộ thì màn tiết lộ chờ bạn bè chạm (không tự chạy lại)
  useEffect(() => {
    if (voucher.revealedAt) setRevealing(false);
  }, [voucher.revealedAt]);

  const kind = layoutFor(voucher.slots);
  const L = LAYOUTS[kind];
  const unused = items.filter((i) => !i.used).sort((a, b) => a.order - b.order);
  const stuck = items.filter((i) => i.used).sort((a, b) => (b.usedAt?.getTime() ?? 0) - (a.usedAt?.getTime() ?? 0));
  const full = stuck.length >= voucher.slots;
  // Bảng sticker gộp theo group (sticker ×N): mỗi nhóm một ô, đại diện = bản chưa dán có order nhỏ nhất.
  // Nhóm nhiều bản đã dán hết vẫn hiện (mờ); sticker lẻ đã dán thì rời bảng như cũ.
  const trayGroups = new Map<string, { key: string; all: Item[]; left: Item[] }>();
  for (const it of [...items].sort((a, b) => a.order - b.order)) {
    const k = groupKey(it);
    const g = trayGroups.get(k) ?? { key: k, all: [], left: [] };
    g.all.push(it);
    if (!it.used) g.left.push(it);
    trayGroups.set(k, g);
  }
  const tray = [...trayGroups.values()].filter((g) => g.left.length > 0 || g.all.length > 1);
  // selected = khoá nhóm
  const selectedItem = trayGroups.get(selected ?? '')?.left[0] ?? null;

  // sticker đã chọn mà bị dán / mất thì bỏ chọn
  useEffect(() => {
    if (selected && !selectedItem) setSelected(null);
  }, [selected, selectedItem]);

  /** Chế độ tập trung: đang chọn sticker → nền mờ, thẻ đứng yên, chỉ voucher + bảng nổi lên */
  const focus = !!selectedItem && !full;
  useEffect(() => {
    if (!focus) return;
    // chỉ cuộn khi thẻ hoặc bảng sticker đang bị khuất (đã thấy đủ thì đứng yên)
    const card = stageWrap.current?.querySelector('.voucher-stage')?.getBoundingClientRect();
    const tray = document.querySelector('.tray')?.getBoundingClientRect();
    if (card && tray) {
      const top = Math.min(card.top, tray.top);
      const bottom = Math.max(card.bottom, tray.bottom);
      const dy = top < 0 ? top - 8 : bottom > innerHeight ? Math.min(bottom - innerHeight + 8, top - 8) : 0;
      if (dy) window.scrollBy({ top: dy, behavior: reducedMotion ? 'auto' : 'smooth' });
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirm) setSelected(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [focus, confirm]);

  const flipTo = (target: Face) => {
    if (target === face) return;
    if (!reducedMotion) buzz(12);
    setFace(target);
  };
  const flip = () => {
    requestTiltPermission(); // iOS: xin quyền nghiêng trong cú chạm thẻ đầu tiên
    flipTo(face === 'front' ? 'back' : 'front');
  };

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

  // ───────── Tiết lộ (cùng khung phần trên) ─────────
  if (!voucher.revealedAt) {
    const start = () => {
      requestTiltPermission();
      if (revealing) return;
      if (reducedMotion) return void run(() => repo.reveal());
      setRevealing(true);
    };
    return (
      <main class="voucher-screen">
        <section class="vs-top">
          <div class="vs-stage">
            <VoucherCard
              voucher={voucher}
              items={items}
              face="front"
              reducedMotion={reducedMotion}
              focus={false}
              poppedId={null}
              onTap={start}
              onCell={() => {}}
              onStuck={() => {}}
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
            <button type="button" class="stage-hint stage-hint--reveal" onClick={start} disabled={revealing || busy}>
              {voucher.revealText}
            </button>
          </div>
        </section>
        {toast && <Toast text={toast} onDone={() => setToast(null)} />}
      </main>
    );
  }

  // ───────── Voucher ─────────
  const pick = (it: Item) => {
    if (full) return;
    const k = groupKey(it);
    if (selected === k) return setSelected(null);
    setSelected(k);
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
        buzz(40);
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

  const trayScale = Math.max(1, Math.ceil(TRAY_MIN_CSS / L.sticker));
  const traySize = L.sticker * trayScale;
  const expired = voucher.expiresAt && voucher.expiresAt.getTime() < Date.now();
  const showTray = unused.length > 0 || full;

  return (
    <main class={`voucher-screen${focus ? ' is-focus' : ''}`}>
      {focus && <div class="focus-backdrop" aria-hidden="true" onClick={() => setSelected(null)} />}

      {/* ── Phần trên: đúng 1 màn hình ── */}
      <section class="vs-top">
        <div class="vs-stage focus-lift" ref={stageWrap}>
          <VoucherCard
            voucher={voucher}
            items={items}
            face={face}
            reducedMotion={reducedMotion}
            focus={focus && face === 'back'}
            poppedId={popped}
            onTap={focus ? () => {} : flip}
            onCell={onCell}
            onStuck={(it) => setDetail(it)}
          />
          <div class="stage-hint">
            <span>Chạm thẻ để lật</span>
            <IconButton icon="iconFlip" label={face === 'front' ? 'Lật sang mặt sau' : 'Lật sang mặt trước'} onClick={flip} faint />
          </div>
        </div>

        {showTray && (
          <section class={`tray frame-tray focus-lift${full ? ' tray--full' : ''}`} aria-label="Bảng sticker">
            <ul class="tray__list" role="list">
              {tray.map((g) => {
                const it = g.left[0] ?? g.all[0];
                const out = g.left.length === 0;
                const isSel = g.key === selected;
                const multi = g.all.length > 1;
                return (
                  <li key={g.key}>
                    <button
                      type="button"
                      class={`tray__item${isSel ? ' is-selected' : ''}${out ? ' is-out' : ''}${dropped && g.all.some((c) => c.id === dropped) ? ' drop-in' : ''}`}
                      style={{ width: `${traySize + 12}px`, height: `${traySize + 12}px` }}
                      aria-pressed={isSel}
                      aria-label={`${it.title}${multi ? `, còn ${g.left.length}` : ''}${isSel ? ' (đang chọn)' : ''}`}
                      disabled={full || out}
                      onClick={() => pick(it)}
                    >
                      <StickerImg item={it} theme={voucher.theme} kind={kind} box={traySize} unit="px" />
                      {multi && (
                        <span class="tray__badge" aria-hidden="true">
                          ×{g.left.length}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            {/* Chiều cao cố định: tên 1 dòng + mô tả tối đa 2 dòng → chọn sticker không làm bố cục nhảy */}
            <div class="tray__info" aria-live="polite">
              {full ? (
                <>
                  <p class="pt1 tray__title">{kind === 'single' ? 'Đã chọn xong món quà 🎉' : 'Đã dán đủ ô 🎉'}</p>
                  <p class="tray__desc">Kéo xuống để xem lại những gì đã dán.</p>
                </>
              ) : selectedItem ? (
                <>
                  <p class="pt1 tray__title">{selectedItem.title}</p>
                  <p class="tray__desc">{selectedItem.description}</p>
                  {/* nằm trong vùng chiều cao cố định → không làm bố cục nhảy */}
                  <span class="tray__cancel">
                    <IconButton icon="iconClose" label="Thôi, bỏ chọn sticker" onClick={() => setSelected(null)} />
                  </span>
                </>
              ) : (
                <>
                  <p class="pt1 tray__title tray__title--muted">Bảng sticker</p>
                  <p class="tray__desc">Chạm một sticker để chọn, rồi chạm ô trống trên thẻ để dán.</p>
                </>
              )}
            </div>
          </section>
        )}

        <ScrollHint target={() => bottom.current} />
      </section>

      {/* ── Phần dưới: lời chúc → "Đã dán" ── */}
      <section class="vs-bottom" ref={bottom}>
        <article class="note frame-tray">
          <p>{voucher.message}</p>
          <p class="note__sign">— {voucher.giverName}</p>
          {voucher.expiresAt && (
            <p class="note__exp">{expired ? 'Đã quá hạn, nhưng Bá Lương dễ tính 😉' : `Hạn dùng: ${fmtDate(voucher.expiresAt)}`}</p>
          )}
        </article>

        <section class="stuck frame-tray" aria-labelledby="stuck-h">
          <h2 class="pt1" id="stuck-h">
            {kind === 'single' ? 'Món đã chọn' : 'Đã dán'}
          </h2>
          {stuck.length === 0 ? (
            <p class="stuck__empty">
              {kind === 'single' ? 'Chưa chọn món nào — cứ thong thả nha.' : 'Chưa dán sticker nào — chọn một cái ở trên rồi chạm ô trống nha.'}
            </p>
          ) : (
            <ul class="stuck__list" role="list">
              {stuck.map((it) => (
                <li key={it.id}>
                  <button type="button" class="stuck__row" onClick={() => setDetail(it)}>
                    <span class="stuck__img">
                      <StickerImg item={it} theme={voucher.theme} kind={kind} box={L.sticker} unit="px" />
                    </span>
                    <span class="stuck__text">
                      <span class="stuck__name">{it.title}</span>
                      {it.usedAt && <span class="stuck__date">dán ngày {fmtDayMonth(it.usedAt)}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>

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
            <p>{detail.description}</p>
            {detail.usedAt && <p class="muted">Dán lúc {fmtTime(detail.usedAt)}</p>}
            <p class="muted">
              {canPeel(detail)
                ? `Còn bóc ra được trong khoảng ${Math.max(1, Math.ceil((detail.usedAt!.getTime() + PEEL_WINDOW_MS - Date.now()) / 3600000))} giờ nữa.`
                : 'Đã quá 24 giờ nên không bóc ra được nữa.'}
            </p>
          </div>
        </Dialog>
      )}

      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
    </main>
  );
}
