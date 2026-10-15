// #/admin/new và #/admin/v/<email> — form voucher + xem trước trực tiếp + sticker + các nút (task 005).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  createVoucher,
  defaultInput,
  deleteVoucher,
  isEmail,
  MAX_SLOTS,
  normalizeEmail,
  randomSeed,
  resetReveal,
  shortHash,
  updateVoucher,
  watchOne,
  writeError,
  type AdminVoucher,
  type VoucherInput,
} from '../data/admin.ts';
import type { Item, Voucher } from '../data/types.ts';
import { hrefFor, navigate } from '../router.ts';
import { useReducedMotion } from '../ui/hooks.ts';
import { FRONT } from '../voucher/layout.ts';
import { THEME_IDS } from '../voucher/themes.ts';
import { VoucherCard, type Face } from '../voucher/Voucher.tsx';
import { Stickers } from './Stickers.tsx';
import { countLines, fromDateInput, overflowsLine, toDateInput, useFontReady } from './util.ts';

type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; message: string };

const fromVoucher = (v: AdminVoucher): VoucherInput => ({
  theme: v.theme,
  title: v.title,
  recipientName: v.recipientName,
  giverName: v.giverName,
  message: v.message,
  revealText: v.revealText,
  slots: v.slots,
  expiresAt: v.expiresAt,
  bgSeed: v.bgSeed,
});
const same = (a: VoucherInput, b: VoucherInput) =>
  JSON.stringify({ ...a, expiresAt: a.expiresAt?.getTime() ?? null }) === JSON.stringify({ ...b, expiresAt: b.expiresAt?.getTime() ?? null });

/** --px riêng cho khung xem trước: 3 trên màn rộng, 2 trên điện thoại */
function usePreviewPx() {
  const calc = () => (innerWidth >= 1000 ? 3 : 2);
  const [px, setPx] = useState(calc);
  useEffect(() => {
    const on = () => setPx(calc());
    addEventListener('resize', on);
    return () => removeEventListener('resize', on);
  }, []);
  return px;
}

/** email = null → tạo mới */
export function VoucherEditor({ email }: { email: string | null }) {
  const isNew = email === null;
  const [live, setLive] = useState<{ voucher: AdminVoucher | null; items: Item[] } | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [form, setForm] = useState<VoucherInput>(defaultInput);
  const [base, setBase] = useState<VoucherInput | null>(null);
  const seedTouched = useRef(false);
  const [save, setSave] = useState<SaveState>({ kind: 'idle' });
  const [action, setAction] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [face, setFace] = useState<Face>('front');
  const reducedMotion = useReducedMotion();
  const fontReady = useFontReady();
  const px = usePreviewPx();

  useEffect(() => {
    if (isNew) return;
    return watchOne(email, setLive, setLoadErr);
  }, [email]);

  // Nạp form một lần khi có dữ liệu (không ghi đè khi đang gõ)
  useEffect(() => {
    if (live?.voucher && !base) {
      const v = fromVoucher(live.voucher);
      setForm(v);
      setBase(v);
    }
  }, [live]);

  const set = <K extends keyof VoucherInput>(k: K, v: VoucherInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (save.kind !== 'saving') setSave({ kind: 'idle' });
  };

  const emailNorm = normalizeEmail(newEmail);
  const onEmail = (s: string) => {
    setNewEmail(s);
    if (!seedTouched.current) set('bgSeed', normalizeEmail(s) ? shortHash(normalizeEmail(s)) : '');
  };

  const dirty = isNew || (base ? !same(form, base) : false);
  const emailErr = isNew && newEmail && !isEmail(emailNorm) ? 'Email chưa đúng dạng.' : null;
  const canSave = save.kind !== 'saving' && dirty && (!isNew || isEmail(emailNorm));

  const doSave = async () => {
    if (!canSave) return;
    setSave({ kind: 'saving' });
    try {
      if (isNew) {
        const e = await createVoucher(emailNorm, form);
        navigate({ name: 'adminEdit', email: e }, true);
      } else {
        await updateVoucher(email, form);
        setBase(form);
        setSave({ kind: 'saved' });
      }
    } catch (e) {
      setSave({ kind: 'error', message: writeError(e) });
    }
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setAction(label);
    setActionErr(null);
    try {
      await fn();
    } catch (e) {
      setActionErr(writeError(e));
    } finally {
      setAction(null);
    }
  };

  // ── Xem trước: dữ liệu đang gõ ──
  const items = live?.items ?? [];
  const pv: Voucher = useMemo(
    () => ({
      email: isNew ? emailNorm : email,
      theme: form.theme,
      title: form.title,
      recipientName: form.recipientName,
      giverName: form.giverName || 'Bá Lương',
      message: form.message,
      revealText: form.revealText,
      slots: Math.max(1, Math.min(MAX_SLOTS, form.slots || 1)),
      expiresAt: form.expiresAt,
      revealedAt: new Date(0),
    }),
    [form, email, emailNorm],
  );
  const warnings: string[] = [];
  if (fontReady) {
    if (countLines(form.title) > 2) warnings.push('Tên voucher dài quá 2 dòng — sẽ bị cắt trên thẻ.');
    if (overflowsLine(form.recipientName, FRONT.recipient.w)) warnings.push('Tên người nhận dài quá 1 dòng — sẽ bị cắt.');
    if (overflowsLine(`từ ${pv.giverName}`, FRONT.giver.w)) warnings.push('"từ " + tên người tặng dài quá 1 dòng — sẽ bị cắt.');
  }
  const lostSlots = items.filter((i) => i.used && i.slot !== null && i.slot >= pv.slots);
  if (lostSlots.length) warnings.push(`${lostSlots.length} sticker đang dán ở ô ≥ ${pv.slots + 1} — giảm số ô sẽ làm chúng không hiện. Bóc ra trước.`);

  if (!isNew && loadErr) return <AdminMessage text={loadErr} />;
  if (!isNew && !live) return <AdminMessage text="Đang tải…" muted />;
  if (!isNew && live && !live.voucher)
    return <AdminMessage text={`Không có voucher cho ${email} (có thể vừa bị xoá).`} />;
  const v = live?.voucher ?? null;

  const field = (id: string, label: string, input: preact.ComponentChildren, hint?: string) => (
    <div class="adm-field">
      <label for={id}>{label}</label>
      {input}
      {hint && <small class="adm-muted">{hint}</small>}
    </div>
  );
  const text = (k: 'title' | 'recipientName' | 'giverName' | 'revealText', id: string) => (
    <input id={id} class="adm-input" value={form[k]} onInput={(e) => set(k, e.currentTarget.value)} />
  );

  return (
    <main class="adm">
      <div class="adm-head">
        <a class="adm-back" href={hrefFor({ name: 'admin' })}>
          ← Danh sách
        </a>
        <h1>{isNew ? 'Tạo voucher' : v?.title || email}</h1>
      </div>

      <div class="adm-editor">
        <section class="adm-card adm-form" aria-label="Thông tin voucher">
          {field(
            'f-email',
            'Email người nhận',
            isNew ? (
              <input
                id="f-email"
                class="adm-input"
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="ten@gmail.com"
                value={newEmail}
                onInput={(e) => onEmail(e.currentTarget.value)}
              />
            ) : (
              <input id="f-email" class="adm-input" value={email} disabled />
            ),
            isNew ? 'Tự chuyển chữ thường. Không sửa được sau khi tạo.' : undefined,
          )}
          {emailErr && <p class="adm-error">{emailErr}</p>}
          <div class="adm-row">
            {field(
              'f-theme',
              'Theme',
              <select id="f-theme" class="adm-input" value={form.theme} onChange={(e) => set('theme', e.currentTarget.value as VoucherInput['theme'])}>
                {THEME_IDS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>,
            )}
            {field(
              'f-slots',
              'Số ô',
              <input
                id="f-slots"
                class="adm-input"
                type="number"
                min={1}
                max={MAX_SLOTS}
                value={form.slots}
                onInput={(e) => set('slots', Math.max(1, Math.min(MAX_SLOTS, Number(e.currentTarget.value) || 1)))}
              />,
              form.slots <= 1 ? 'Kiểu một ô (sticker 48)' : 'Kiểu nhiều ô (sticker 24)',
            )}
          </div>
          {field('f-title', 'Tên voucher', text('title', 'f-title'), 'Tối đa 2 dòng trên thẻ')}
          <div class="adm-row">
            {field('f-recipient', 'Tên người nhận', text('recipientName', 'f-recipient'))}
            {field('f-giver', 'Người tặng', text('giverName', 'f-giver'))}
          </div>
          {field(
            'f-message',
            'Lời chúc',
            <textarea id="f-message" class="adm-input adm-textarea" rows={4} value={form.message} onInput={(e) => set('message', e.currentTarget.value)} />,
          )}
          {field('f-reveal', 'Chữ màn tiết lộ', text('revealText', 'f-reveal'))}
          <div class="adm-row">
            {field(
              'f-exp',
              'Hạn dùng',
              <input
                id="f-exp"
                class="adm-input"
                type="date"
                value={toDateInput(form.expiresAt)}
                onInput={(e) => set('expiresAt', fromDateInput(e.currentTarget.value))}
              />,
              'Để trống = không hạn',
            )}
            {field(
              'f-seed',
              'bgSeed (nền động)',
              <span class="adm-inline">
                <input
                  id="f-seed"
                  class="adm-input"
                  value={form.bgSeed}
                  onInput={(e) => {
                    seedTouched.current = true;
                    set('bgSeed', e.currentTarget.value);
                  }}
                />
                <button
                  type="button"
                  class="adm-btn"
                  title="Ngẫu nhiên"
                  aria-label="bgSeed ngẫu nhiên"
                  onClick={() => {
                    seedTouched.current = true;
                    set('bgSeed', randomSeed());
                  }}
                >
                  🎲
                </button>
              </span>,
            )}
          </div>

          <div class="adm-savebar">
            <button type="button" class="adm-btn adm-btn--primary" onClick={doSave} disabled={!canSave}>
              {save.kind === 'saving' ? 'Đang lưu…' : isNew ? 'Tạo voucher' : 'Lưu'}
            </button>
            <span class="adm-status" role="status">
              {save.kind === 'saved' && !dirty && '✓ Đã lưu'}
              {save.kind !== 'saving' && !isNew && dirty && 'Có thay đổi chưa lưu'}
            </span>
          </div>
          {save.kind === 'error' && (
            <p class="adm-error" role="alert">
              {save.message}
            </p>
          )}
        </section>

        <aside class="adm-card adm-preview-col" aria-label="Xem trước">
          <div class="adm-preview-head">
            <h2>Xem trước</h2>
            <button type="button" class="adm-btn" onClick={() => setFace(face === 'front' ? 'back' : 'front')}>
              ↻ {face === 'front' ? 'Mặt sau' : 'Mặt trước'}
            </button>
          </div>
          <div class="adm-preview" data-theme={form.theme} style={{ '--px': `${px}px` }}>
            <VoucherCard
              voucher={pv}
              items={items}
              face={face}
              reducedMotion={reducedMotion}
              focus={false}
              poppedId={null}
              onTap={() => setFace(face === 'front' ? 'back' : 'front')}
              onCell={() => {}}
              onStuck={() => {}}
            />
          </div>
          {warnings.length > 0 && (
            <ul class="adm-warn" role="status">
              {warnings.map((w) => (
                <li key={w}>⚠ {w}</li>
              ))}
            </ul>
          )}
          {!fontReady && <p class="adm-muted">Đang tải font để đo chữ…</p>}
        </aside>
      </div>

      {!isNew && v && (
        <>
          <Stickers email={email} voucher={v} items={items} formSlots={pv.slots} onSuggestSlots={(n) => set('slots', n)} />

          <section class="adm-card" aria-labelledby="act-h">
            <h2 id="act-h">Thao tác</h2>
            <p class="adm-muted">
              {v.revealedAt ? `Đã tiết lộ lúc ${v.revealedAt.toLocaleString('vi-VN')}.` : 'Bạn bè chưa mở màn tiết lộ.'}
            </p>
            <div class="adm-actions">
              <button
                type="button"
                class="adm-btn"
                disabled={!!action || !v.revealedAt}
                onClick={() => confirm('Reset tiết lộ? Bạn bè sẽ thấy lại màn tiết lộ.') && run('reset', () => resetReveal(email))}
              >
                {action === 'reset' ? 'Đang reset…' : 'Reset tiết lộ'}
              </button>
              <a class="adm-btn" href={hrefFor({ name: 'adminPreview', email })}>
                Xem như bạn bè
              </a>
              <button type="button" class="adm-btn adm-btn--danger" disabled={!!action} onClick={() => setConfirmDelete(true)}>
                Xoá voucher
              </button>
            </div>
            {confirmDelete && (
              <div class="adm-danger">
                <p>
                  Xoá voucher, mọi sticker và lịch sử của <b>{email}</b>? Không hoàn tác được. Gõ lại email để xác nhận:
                </p>
                <input class="adm-input" value={deleteText} autoComplete="off" onInput={(e) => setDeleteText(e.currentTarget.value)} placeholder={email} />
                <div class="adm-actions">
                  <button
                    type="button"
                    class="adm-btn adm-btn--danger"
                    disabled={normalizeEmail(deleteText) !== email || !!action}
                    onClick={() =>
                      run('delete', async () => {
                        await deleteVoucher(email);
                        navigate({ name: 'admin' }, true);
                      })
                    }
                  >
                    {action === 'delete' ? 'Đang xoá…' : 'Xoá hẳn'}
                  </button>
                  <button
                    type="button"
                    class="adm-btn"
                    onClick={() => {
                      setConfirmDelete(false);
                      setDeleteText('');
                    }}
                  >
                    Thôi
                  </button>
                </div>
              </div>
            )}
            {actionErr && (
              <p class="adm-error" role="alert">
                {actionErr}
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export function AdminMessage({ text, muted }: { text: string; muted?: boolean }) {
  return (
    <main class="adm">
      <div class="adm-head">
        <a class="adm-back" href={hrefFor({ name: 'admin' })}>
          ← Danh sách
        </a>
      </div>
      <p class={muted ? 'adm-muted' : 'adm-error'}>{text}</p>
    </main>
  );
}
