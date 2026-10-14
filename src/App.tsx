import { lazy, Suspense } from 'preact/compat';
import { GiftIcon } from './GiftIcon';

// Trang thử font chỉ tải khi mở bằng ?fonts
const FontTest = lazy(() => import('./fonts/FontTest').then((m) => ({ default: m.FontTest })));

export function App() {
  if (new URLSearchParams(location.search).has('fonts')) {
    return (
      <Suspense fallback={<p class="center">Đang tải…</p>}>
        <FontTest />
      </Suspense>
    );
  }
  return (
    <main class="center soon">
      <GiftIcon />
      <p>Sắp có quà…</p>
    </main>
  );
}
