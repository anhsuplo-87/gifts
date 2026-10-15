// Màn admin TẠM (task 004): chỉ có "Xem như bạn bè" (chỉ đọc). Task 005 làm admin thật.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { PreviewRepo } from '../data/firestore.ts';
import type { ViewState } from '../data/types.ts';
import { navigate, type Route } from '../router.ts';
import { Button } from '../ui/Kit.tsx';
import { ErrorScreen, LoadingScreen } from '../ui/Screens.tsx';
import { VoucherScreen } from '../voucher/VoucherScreen.tsx';

export function AdminPlaceholder({ route }: { route: Route }) {
  if (route.name === 'adminPreview') return <AdminPreview email={route.email} />;
  return <AdminHome />;
}

function AdminHome() {
  const [email, setEmail] = useState('');
  const go = (e: Event) => {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (v) navigate({ name: 'adminPreview', email: v });
  };
  return (
    <main class="screen">
      <h1 class="pt2">Admin</h1>
      <p class="lead">Đang làm (task 005). Tạm thời có thể xem voucher của một email ở chế độ chỉ đọc.</p>
      <form class="admin-form" onSubmit={go}>
        <label class="sr-only" for="admin-email">
          Email bạn bè
        </label>
        <input
          id="admin-email"
          class="field"
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder="email@ví-dụ.com"
          value={email}
          onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)}
        />
        <Button icon="iconCheck" onClick={() => go(new Event('submit'))}>
          Xem như bạn bè
        </Button>
      </form>
    </main>
  );
}

function AdminPreview({ email }: { email: string }) {
  const repo = useMemo(() => new PreviewRepo(email), [email]);
  const [state, setState] = useState<ViewState>({ kind: 'loading' });
  useEffect(() => repo.watchVoucher(setState), [repo]);
  return (
    <>
      <div class="preview-bar" role="status">
        <span>
          Xem như <b>{email}</b> — chỉ đọc
        </span>
        <Button variant="secondary" onClick={() => navigate({ name: 'admin' })}>
          Quay lại
        </Button>
      </div>
      {state.kind === 'loading' && <LoadingScreen />}
      {state.kind === 'noVoucher' && (
        <main class="screen">
          <h1 class="pt1">Email này chưa có voucher</h1>
        </main>
      )}
      {state.kind === 'error' && <ErrorScreen message={state.message} onRetry={() => location.reload()} />}
      {state.kind === 'ready' && <VoucherScreen repo={repo} voucher={state.voucher} items={state.items} />}
    </>
  );
}
