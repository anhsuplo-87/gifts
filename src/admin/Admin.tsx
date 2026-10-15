// Admin (task 005, SPEC §2.2) — tải riêng (lazy) chỉ khi đăng nhập bằng UID admin.
//   #/admin              → AdminHome (Mới dán + danh sách voucher)
//   #/admin/new          → tạo voucher
//   #/admin/v/<email>    → sửa voucher + sticker
//   #/admin/v/<email>/xem → xem như bạn bè (chỉ đọc)
import { useEffect, useMemo, useState } from 'preact/hooks';
import { PreviewRepo } from '../data/firestore.ts';
import type { ViewState } from '../data/types.ts';
import { navigate, type Route } from '../router.ts';
import { Button } from '../ui/Kit.tsx';
import { ErrorScreen, LoadingScreen } from '../ui/Screens.tsx';
import { VoucherScreen } from '../voucher/VoucherScreen.tsx';
import { AdminHome } from './AdminHome.tsx';
import { VoucherEditor } from './VoucherEditor.tsx';
import './admin.css';

export function Admin({ route }: { route: Route }) {
  if (route.name === 'adminPreview') return <AdminPreview email={route.email} />;
  if (route.name === 'adminNew') return <VoucherEditor key="new" email={null} />;
  if (route.name === 'adminEdit') return <VoucherEditor key={route.email} email={route.email} />;
  return <AdminHome />;
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
        <Button variant="secondary" onClick={() => navigate({ name: 'adminEdit', email })}>
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
