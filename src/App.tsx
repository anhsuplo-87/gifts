import { lazy, Suspense } from 'preact/compat';
import { GiftIcon } from './GiftIcon';

// Trang thử font chỉ có ở bản dev (import.meta.env.DEV = false khi build → bị loại khỏi bundle)
const FontTest = import.meta.env.DEV
  ? lazy(() => import('./fonts/FontTest').then((m) => ({ default: m.FontTest })))
  : null;

export function App() {
  if (FontTest && new URLSearchParams(location.search).has('fonts')) {
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
