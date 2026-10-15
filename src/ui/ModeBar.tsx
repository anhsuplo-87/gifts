// Thanh chọn chế độ giả (chỉ hiện khi URL có ?mock) để duyệt nhanh ở Cổng 2.
import { useState } from 'preact/hooks';
import { MOCK_LABELS, MOCK_MODES, type MockMode } from '../data/mock.ts';

export function ModeBar({ mode }: { mode: MockMode }) {
  const [open, setOpen] = useState(false);
  const go = (m: MockMode) => {
    const url = new URL(location.href);
    url.searchParams.set('mock', m);
    location.href = url.toString();
  };
  return (
    <nav class={`modebar${open ? ' modebar--open' : ''}`} aria-label="Chọn chế độ dữ liệu giả">
      <button type="button" class="modebar__toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        mock: {mode}
      </button>
      {open && (
        <ul>
          {MOCK_MODES.map((m) => (
            <li key={m}>
              <button type="button" aria-current={m === mode} onClick={() => go(m)}>
                {MOCK_LABELS[m]} <small>{m}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
