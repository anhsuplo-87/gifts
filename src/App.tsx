import { lazy, Suspense } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';
import { hasFirebaseConfig } from './config.ts';
import { isInAppBrowser } from './data/inapp.ts';
import { MockRepo, readMockMode } from './data/mock.ts';
import type { GiftRepo, ViewState } from './data/types.ts';
import { navigate, useRoute } from './router.ts';
import { IconButton } from './ui/Kit.tsx';
import { ModeBar } from './ui/ModeBar.tsx';
import { EmptyScreen, ErrorScreen, InAppScreen, LoadingScreen, LoginScreen } from './ui/Screens.tsx';
import { usePx } from './ui/hooks.ts';
import { VoucherScreen } from './voucher/VoucherScreen.tsx';

// Trang thử font chỉ có ở bản dev (import.meta.env.DEV = false khi build → bị loại khỏi bundle)
const FontTest = import.meta.env.DEV
  ? lazy(() => import('./fonts/FontTest').then((m) => ({ default: m.FontTest })))
  : null;
// Admin (task 005) — tải riêng, chỉ khi đăng nhập bằng UID admin
const Admin = lazy(() => import('./admin/Admin.tsx').then((m) => ({ default: m.Admin })));

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

const isMock = () => new URLSearchParams(location.search).has('mock');

/**
 * ?mock=…  → dữ liệu giả (không tải Firebase).
 * Không có → Firebase thật (emulator khi dev / ?emu). Firebase được import động để bundle chính nhẹ.
 */
function useRepo(): GiftRepo | 'noConfig' | null {
  const [repo, setRepo] = useState<GiftRepo | 'noConfig' | null>(() => (isMock() ? new MockRepo(readMockMode()) : null));
  useEffect(() => {
    if (repo) return;
    if (!hasFirebaseConfig()) return setRepo('noConfig');
    import('./data/firestore.ts').then((m) => setRepo(new m.FirestoreRepo()));
  }, []);
  return repo;
}

function GiftApp() {
  usePx();
  const mock = isMock();
  const mode = readMockMode();
  const repo = useRepo();
  const route = useRoute();
  const [state, setState] = useState<ViewState>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  useEffect(() => (repo && repo !== 'noConfig' ? repo.watchVoucher(setState) : undefined), [repo]);

  // Phân vai: admin → #/admin; người khác không vào được #/admin
  useEffect(() => {
    if (state.kind === 'admin' && route.name === 'home') navigate({ name: 'admin' }, true);
    if (state.kind !== 'admin' && state.kind !== 'loading' && route.name !== 'home') navigate({ name: 'home' }, true);
  }, [state.kind, route.name]);

  const inApp = (mock && mode === 'inapp') || isInAppBrowser();
  const theme = state.kind === 'ready' ? state.voucher.theme : 'designer';
  // màu html trùng nền (thanh địa chỉ iOS / kéo quá đà không lộ màu khác)
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const live = repo && repo !== 'noConfig' ? repo : null;
  const signIn = async () => {
    if (!live) return;
    setBusy(true);
    setLoginError(null);
    try {
      await live.signIn();
    } catch (e) {
      const m = mock ? null : (await import('./data/firestore.ts')).signInMessage(e);
      setLoginError(m ?? 'Chưa đăng nhập được, thử lại nha.');
    } finally {
      setBusy(false);
    }
  };
  const signOut = () => void live?.signOut();

  let body;
  if (repo === 'noConfig')
    body = (
      <main class="screen">
        <h1 class="pt1">Chưa cấu hình</h1>
        <p class="lead">Trang chưa có cấu hình Firebase (src/config.ts).</p>
      </main>
    );
  // trình duyệt trong app: không gọi popup đăng nhập, mời mở bằng Chrome/Safari
  else if (inApp && (state.kind === 'signedOut' || state.kind === 'loading')) body = <InAppScreen />;
  else if (!live || state.kind === 'loading') body = <LoadingScreen />;
  else if (state.kind === 'signedOut') body = <LoginScreen onSignIn={signIn} busy={busy} error={loginError} />;
  else if (state.kind === 'admin')
    body = (
      <Suspense fallback={<LoadingScreen />}>
        <Admin route={route} />
      </Suspense>
    );
  else if (state.kind === 'noVoucher') body = <EmptyScreen email={state.email} onSwitch={signOut} />;
  else if (state.kind === 'error') body = <ErrorScreen message={state.message} onRetry={() => live.retry()} />;
  else body = <VoucherScreen repo={live} voucher={state.voucher} items={state.items} />;

  const email =
    state.kind === 'ready' || state.kind === 'noVoucher' || state.kind === 'error' || state.kind === 'admin' ? (state.email ?? null) : null;

  return (
    <div class="app" data-theme={theme}>
      <div class="app-bg" aria-hidden="true" />
      {email && !(inApp && mock) && (
        <header class="header">
          <span class="header__email" title={email}>
            {email}
          </span>
          <IconButton icon="iconLogout" label="Đăng xuất" onClick={signOut} />
        </header>
      )}
      {body}
      {mock && <ModeBar mode={mode} />}
    </div>
  );
}
