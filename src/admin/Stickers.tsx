// Sticker của một voucher (task 005): danh sách theo nhóm (×N), lên/xuống, thêm/sửa/xoá, upload ảnh,
// admin dán (chọn ô trống) / bóc bất kỳ lúc nào.
import { useState } from 'preact/hooks';
import {
  adminPeel,
  adminStick,
  deleteStickerGroup,
  groupItems,
  MAX_COPIES,
  moveStickerGroup,
  saveStickerGroup,
  writeError,
  type AdminVoucher,
  type StickerGroup,
} from '../data/admin.ts';
import type { Item } from '../data/types.ts';
import { u } from '../ui/tokens.ts';
import { LAYOUTS, layoutFor, maxCells } from '../voucher/layout.ts';
import { StickerImg } from '../voucher/Sticker.tsx';
import type { ThemeId } from '../voucher/themes.ts';
import { fmtDateTime, IMG_MAX_SIDE, readStickerImage, useImageSize } from './util.ts';

type Props = {
  email: string;
  voucher: AdminVoucher;
  items: Item[];
  /** số ô đang gõ trong form (có thể chưa lưu) */
  formSlots: number;
  onSuggestSlots: (n: number) => void;
};

export function Stickers({ email, voucher, items, formSlots, onSuggestSlots }: Props) {
  const groups = groupItems(items);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [stickTo, setStickTo] = useState<Record<string, string>>({});

  const kind = layoutFor(voucher.slots);
  const slots = Math.min(voucher.slots, maxCells(kind));
  const taken = new Set(items.filter((i) => i.used && i.slot !== null).map((i) => i.slot!));
  const freeSlots = Array.from({ length: slots }, (_, s) => s).filter((s) => !taken.has(s));
  const total = items.length;

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setErr(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setErr(writeError(e));
      return false;
    } finally {
      setBusy(null);
    }
  };

  return (
    <section class="adm-card" aria-labelledby="st-h">
      <div class="adm-preview-head">
        <h2 id="st-h">
          Sticker <span class="adm-muted">({total} bản · {voucher.slots} ô)</span>
        </h2>
        {editing !== 'new' && (
          <button type="button" class="adm-btn adm-btn--primary" onClick={() => setEditing('new')}>
            + Thêm sticker
          </button>
        )}
      </div>
      {total > 0 && total < formSlots && (
        <p class="adm-hint">
          Có {total} bản sticker nhưng {formSlots} ô — sẽ có ô không bao giờ được dán.{' '}
          <button type="button" class="adm-link" onClick={() => onSuggestSlots(Math.max(1, total))}>
            Đặt số ô = {total}
          </button>{' '}
          (nhớ bấm Lưu)
        </p>
      )}
      {total > formSlots && <p class="adm-muted">Nhiều sticker hơn số ô → bạn bè chọn {formSlots} trong {total}.</p>}
      {err && (
        <p class="adm-error" role="alert">
          {err}
        </p>
      )}

      {editing === 'new' && (
        <StickerForm
          group={null}
          theme={voucher.theme}
          slots={formSlots}
          busy={busy === 'save'}
          onCancel={() => setEditing(null)}
          onSave={async (input) => (await run('save', () => saveStickerGroup(email, null, input, items))) && setEditing(null)}
        />
      )}

      {groups.length === 0 && editing !== 'new' && <p class="adm-muted">Chưa có sticker nào.</p>}
      <ul class="adm-stickers">
        {groups.map((g, i) =>
          editing === g.key ? (
            <li key={g.key}>
              <StickerForm
                group={g}
                theme={voucher.theme}
                slots={formSlots}
                busy={busy === 'save'}
                onCancel={() => setEditing(null)}
                onSave={async (input) => (await run('save', () => saveStickerGroup(email, g, input, items))) && setEditing(null)}
              />
            </li>
          ) : (
            <li key={g.key} class="adm-sticker">
              <div class="adm-sticker__top">
                <span class="adm-thumb adm-thumb--lg">
                  <StickerImg item={g.copies[0]} theme={voucher.theme} kind={kind} box={48} unit="px" />
                </span>
                <span class="adm-sticker__text">
                  <b>
                    {g.title}
                    {g.copies.length > 1 && ` ×${g.copies.length}`}
                  </b>
                  {g.used > 0 && <span class="adm-muted"> (đã dán {g.used})</span>}
                  <small>{g.description || <i>không có mô tả</i>}</small>
                </span>
                <span class="adm-sticker__btns">
                  <button type="button" class="adm-btn adm-btn--icon" aria-label="Lên" disabled={i === 0 || !!busy} onClick={() => run('move', () => moveStickerGroup(email, groups, i, -1))}>
                    ↑
                  </button>
                  <button
                    type="button"
                    class="adm-btn adm-btn--icon"
                    aria-label="Xuống"
                    disabled={i === groups.length - 1 || !!busy}
                    onClick={() => run('move', () => moveStickerGroup(email, groups, i, 1))}
                  >
                    ↓
                  </button>
                  <button type="button" class="adm-btn" disabled={!!busy} onClick={() => setEditing(g.key)}>
                    Sửa
                  </button>
                  <button
                    type="button"
                    class="adm-btn adm-btn--danger"
                    disabled={!!busy}
                    onClick={() =>
                      confirm(`Xoá "${g.title}"${g.copies.length > 1 ? ` (cả ${g.copies.length} bản)` : ''}?${g.used ? ' Có bản đang dán trên thẻ!' : ''}`) &&
                      run('del', () => deleteStickerGroup(email, g))
                    }
                  >
                    Xoá
                  </button>
                </span>
              </div>
              <ul class="adm-copies">
                {g.copies.map((c, ci) => (
                  <li key={c.id}>
                    <span class="adm-muted">{g.copies.length > 1 ? `Bản ${ci + 1}` : 'Trạng thái'}:</span>{' '}
                    {c.used ? (
                      <>
                        dán ở ô {c.slot !== null ? c.slot + 1 : '?'}
                        {c.usedAt && <span class="adm-muted"> · {fmtDateTime(c.usedAt)}</span>}{' '}
                        <button type="button" class="adm-link" disabled={!!busy} onClick={() => run(`peel-${c.id}`, () => adminPeel(email, c.id))}>
                          {busy === `peel-${c.id}` ? 'đang bóc…' : 'Bóc ra'}
                        </button>
                      </>
                    ) : freeSlots.length ? (
                      <>
                        chưa dán{' '}
                        <select
                          class="adm-input adm-input--sm"
                          aria-label="Chọn ô trống"
                          value={stickTo[c.id] ?? String(freeSlots[0])}
                          onChange={(e) => setStickTo({ ...stickTo, [c.id]: e.currentTarget.value })}
                        >
                          {freeSlots.map((s) => (
                            <option key={s} value={s}>
                              ô {s + 1}
                            </option>
                          ))}
                        </select>{' '}
                        <button
                          type="button"
                          class="adm-link"
                          disabled={!!busy}
                          onClick={() => {
                            const s = Number(stickTo[c.id] ?? freeSlots[0]);
                            if (!freeSlots.includes(s)) return setErr('Ô đó vừa có sticker, chọn ô khác.');
                            run(`stick-${c.id}`, () => adminStick(email, c.id, s));
                          }}
                        >
                          {busy === `stick-${c.id}` ? 'đang dán…' : 'Dán thay'}
                        </button>
                      </>
                    ) : (
                      <>chưa dán · hết ô trống</>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

// ───────── Form sticker ─────────

function StickerForm(props: {
  group: StickerGroup | null;
  theme: ThemeId;
  slots: number;
  busy: boolean;
  onCancel: () => void;
  onSave: (input: { title: string; description: string; image: string | null; count: number }) => void;
}) {
  const { group, theme, slots, busy } = props;
  const [title, setTitle] = useState(group?.title ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [image, setImage] = useState<string | null>(group?.image ?? null);
  const [count, setCount] = useState(group?.copies.length ?? 1);
  const [imgErr, setImgErr] = useState<string | null>(null);
  const size = useImageSize(image);

  const kind = layoutFor(slots);
  const L = LAYOUTS[kind];
  const minCount = group ? group.used : 1;
  const maxCount = Math.min(MAX_COPIES, Math.max(1, slots));
  const countErr =
    count > maxCount
      ? `Tối đa ${maxCount} bản (không vượt số ô).`
      : count < Math.max(1, minCount)
        ? `Đã dán ${minCount} bản — không giảm dưới ${minCount} được (bóc ra trước).`
        : null;
  const sizeHint = size && Math.max(size.w, size.h) !== L.sticker ? `Ảnh ${size.w}×${size.h}px — sticker chuẩn của kiểu ${kind === 'single' ? 'một ô' : 'nhiều ô'} là ${L.sticker}×${L.sticker}px.` : null;

  const onFile = async (input: HTMLInputElement) => {
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    setImgErr(null);
    try {
      const r = await readStickerImage(f);
      setImage(r.dataUrl);
    } catch (e) {
      setImgErr(e instanceof Error ? e.message : 'Không đọc được ảnh.');
    }
  };

  const fake: Item = { id: group?.key ?? 'new', title, description, image, order: 0, used: false, usedAt: null, slot: null };
  const id = group?.key ?? 'new';

  return (
    <div class="adm-stform">
      <div class="adm-stform__grid">
        <div class="adm-stform__fields">
          <div class="adm-field">
            <label for={`st-title-${id}`}>Tên sticker</label>
            <input id={`st-title-${id}`} class="adm-input" value={title} onInput={(e) => setTitle(e.currentTarget.value)} />
          </div>
          <div class="adm-field">
            <label for={`st-desc-${id}`}>Mô tả</label>
            <textarea id={`st-desc-${id}`} class="adm-input adm-textarea" rows={2} value={description} onInput={(e) => setDescription(e.currentTarget.value)} />
          </div>
          <div class="adm-field">
            <label for={`st-count-${id}`}>Số lượng</label>
            <input
              id={`st-count-${id}`}
              class="adm-input adm-input--sm"
              type="number"
              min={1}
              max={MAX_COPIES}
              value={count}
              onInput={(e) => setCount(Math.round(Number(e.currentTarget.value)) || 1)}
            />
            <small class="adm-muted">Mỗi bản dán được 1 lần. Giảm chỉ xoá bản chưa dán.</small>
          </div>
          {countErr && <p class="adm-error">{countErr}</p>}
        </div>
        <div class="adm-field">
          <span class="adm-label">Ảnh (PNG/GIF ≤ 100 KB, cạnh ≤ {IMG_MAX_SIDE}px)</span>
          <div class="adm-cellprev" data-theme={theme} style={{ '--px': '3px' }}>
            <div
              class="adm-cellprev__cell"
              style={{ width: u(L.cell), height: u(L.cell), backgroundImage: kind === 'single' ? 'var(--img-slot-big)' : 'var(--img-slot-empty)' }}
            >
              <StickerImg item={fake} theme={theme} kind={kind} box={L.cell} unit="u" />
            </div>
            <small>trong ô ×3</small>
          </div>
          <span class="adm-inline">
            <label class="adm-btn">
              Chọn ảnh…
              <input type="file" accept="image/png,image/gif" class="sr-only" onChange={(e) => onFile(e.currentTarget)} />
            </label>
            {image && (
              <button type="button" class="adm-btn" onClick={() => setImage(null)}>
                Bỏ ảnh
              </button>
            )}
          </span>
          {!image && <small class="adm-muted">Chưa có ảnh → dùng hình placeholder của theme.</small>}
          {imgErr && (
            <p class="adm-error" role="alert">
              {imgErr}
            </p>
          )}
          {sizeHint && <p class="adm-hint">⚠ {sizeHint}</p>}
        </div>
      </div>
      <div class="adm-actions">
        <button
          type="button"
          class="adm-btn adm-btn--primary"
          disabled={busy || !title.trim() || !!countErr}
          onClick={() => props.onSave({ title, description, image, count })}
        >
          {busy ? 'Đang lưu…' : group ? 'Lưu sticker' : 'Thêm'}
        </button>
        <button type="button" class="adm-btn" disabled={busy} onClick={props.onCancel}>
          Huỷ
        </button>
      </div>
    </div>
  );
}
