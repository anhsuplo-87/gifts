// #/admin — "Mới dán" (realtime) + danh sách voucher (SPEC §2.2, task 005).
import { useEffect, useState } from 'preact/hooks';
import { watchAll, watchRecent, type AdminVoucher, type RecentStick } from '../data/admin.ts';
import type { Item } from '../data/types.ts';
import { hrefFor } from '../router.ts';
import { layoutFor } from '../voucher/layout.ts';
import { StickerImg } from '../voucher/Sticker.tsx';
import { timeAgo, useNow } from './util.ts';

export function AdminHome() {
  const [all, setAll] = useState<{ vouchers: AdminVoucher[]; items: Map<string, Item[]> } | null>(null);
  const [recent, setRecent] = useState<RecentStick[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [recentErr, setRecentErr] = useState<string | null>(null);
  const now = useNow();
  useEffect(() => watchAll(setAll, setErr), []);
  useEffect(() => watchRecent(setRecent, setRecentErr), []);

  const byEmail = new Map(all?.vouchers.map((v) => [v.email, v]));

  return (
    <main class="adm">
      <div class="adm-head">
        <h1>Quản lý quà</h1>
        <a class="adm-btn adm-btn--primary" href={hrefFor({ name: 'adminNew' })}>
          + Tạo voucher
        </a>
      </div>

      <section class="adm-card" aria-labelledby="recent-h">
        <h2 id="recent-h">Mới dán</h2>
        {recentErr && <p class="adm-error">{recentErr}</p>}
        {!recent && !recentErr && <p class="adm-muted">Đang tải…</p>}
        {recent && recent.length === 0 && <p class="adm-muted">Chưa ai dán sticker nào.</p>}
        {recent && recent.length > 0 && (
          <ul class="adm-recent">
            {recent.map(({ email, item }) => {
              const v = byEmail.get(email);
              return (
                <li key={`${email}/${item.id}`}>
                  <a href={hrefFor({ name: 'adminEdit', email })} class="adm-recent__row">
                    <span class="adm-thumb">
                      <StickerImg item={item} theme={v?.theme ?? 'designer'} kind={layoutFor(v?.slots ?? 2)} box={32} unit="px" />
                    </span>
                    <span class="adm-recent__text">
                      <span>
                        <b>{v?.recipientName || email}</b> dán <b>{item.title}</b>
                      </span>
                      <small>
                        {email}
                        {item.slot !== null && ` · ô ${item.slot + 1}`}
                      </small>
                    </span>
                    <span class="adm-recent__time" title={item.usedAt?.toLocaleString('vi-VN')}>
                      {timeAgo(item.usedAt, now)}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section class="adm-card" aria-labelledby="list-h">
        <h2 id="list-h">Voucher {all && <span class="adm-muted">({all.vouchers.length})</span>}</h2>
        {err && <p class="adm-error">{err}</p>}
        {!all && !err && <p class="adm-muted">Đang tải…</p>}
        {all && all.vouchers.length === 0 && <p class="adm-muted">Chưa có voucher nào. Bấm "Tạo voucher" để bắt đầu.</p>}
        {all && all.vouchers.length > 0 && (
          <ul class="adm-list">
            {all.vouchers.map((v) => {
              const items = all.items.get(v.email) ?? [];
              const used = items.filter((i) => i.used).length;
              return (
                <li key={v.email}>
                  <a href={hrefFor({ name: 'adminEdit', email: v.email })} class="adm-list__row">
                    <span class="adm-list__main">
                      <b>{v.title || '(chưa đặt tên)'}</b>
                      <span>
                        {v.recipientName || '—'} · <span class="adm-muted">{v.email}</span>
                      </span>
                    </span>
                    <span class="adm-tags">
                      <span class={`adm-tag adm-tag--${v.theme}`}>{v.theme}</span>
                      <span class="adm-tag" title="đã dán / số ô">
                        {used}/{v.slots} ô · {items.length} sticker
                      </span>
                      <span class={`adm-tag${v.revealedAt ? ' adm-tag--ok' : ''}`}>{v.revealedAt ? 'đã tiết lộ' : 'chưa tiết lộ'}</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
