import { lazy, Suspense } from 'preact/compat';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { isInAppBrowser } from './data/inapp.ts';
import { MockRepo, readMockMode } from './data/mock.ts';
import type { ViewState } from './data/types.ts';
import { IconButton } from './ui/Kit.tsx';
import { ModeBar } from './ui/ModeBar.tsx';
import { EmptyScreen, ErrorScreen, InAppScreen, LoadingScreen, LoginScreen } from './ui/Screens.tsx';
import { usePx } from './ui/hooks.ts';
import { VoucherScreen } from './voucher/VoucherScreen.tsx';

// Trang thử font chỉ có ở bản dev (import.meta.env.DEV = false khi build → bị loại khỏi bundle)
const FontTest = import.meta.env.DEV
  ? lazy(() => import('./fonts/FontTest').then((m) => ({ default: m.FontTest })))
  : null;

export function App() {
  if (FontTest && new URLSearchParams(location.search).has('fonts')) {
    return (
      <Suspense fallback={<p>Đang tải…</p>}>
        <FontTest />
      </Suspense>
    );
  }
  return <GiftApp />;
}

function GiftApp() {
  usePx();
  const params = new URLSearchParams(location.search);
  const showModeBar = params.has('mock');
  const mode = readMockMode();
  // Chưa có Firebase (T004): luôn dùng dữ liệu giả, mặc định ?mock=login
  const repo = useMemo(() => new MockRepo(mode), []);
  const [state, setState] = useState<ViewState>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  useEffect(() => repo.watchVoucher(setState), [repo]);

  const inApp = mode === 'inapp' || isInAppBrowser();
  const theme = state.kind === 'ready' ? state.voucher.theme : 'designer';

  const signIn = async () => {
    setBusy(true);
    try {
      await repo.signIn();
    } finally {
      setBusy(false);
    }
  };
  const signOut = () => void repo.signOut();

  let body;
  if (inApp) body = <InAppScreen />;
  else if (state.kind === 'loading') body = <LoadingScreen />;
  else if (state.kind === 'signedOut') body = <LoginScreen onSignIn={signIn} busy={busy} />;
  else if (state.kind === 'noVoucher') body = <EmptyScreen email={state.email} onSwitch={signOut} />;
  else if (state.kind === 'error') body = <ErrorScreen message={state.message} onRetry={() => repo.retry()} />;
  else body = <VoucherScreen repo={repo} voucher={state.voucher} items={state.items} />;

  const email = state.kind === 'ready' || state.kind === 'noVoucher' || state.kind === 'error' ? (state.email ?? null) : null;

  // màu html trùng nền (thanh địa chỉ iOS / kéo quá đà không lộ màu khác)
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div class="app" data-theme={theme}>
      <div class="app-bg" aria-hidden="true" />
      {email && !inApp && (
        <header class="header">
          <span class="header__email" title={email}>
            {email}
          </span>
          <IconButton icon="iconLogout" label="Đăng xuất" onClick={signOut} />
        </header>
      )}
      {body}
      {showModeBar && <ModeBar mode={mode} />}
    </div>
  );
}
