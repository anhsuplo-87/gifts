// Các màn đứng riêng (SPEC §2.3, §3): đang tải, đăng nhập, trình duyệt trong app, chưa có quà, lỗi.
// Chữ căn giữa; nút nhỏ. Empty / error dùng header chung (App) và 2 hình riêng.
import { useState } from 'preact/hooks';
import type { COMMON_ASSETS } from '../voucher/assets.ts';
import { Button } from './Kit.tsx';
import { commonImg, u } from './tokens.ts';

function Art({ name, alt, size = 32 }: { name: keyof typeof COMMON_ASSETS; alt: string; size?: number }) {
  return <img class="art" src={commonImg(name)} alt={alt} style={{ width: u(size), height: u(size) }} />;
}

export function LoadingScreen() {
  return (
    <main class="screen" aria-busy="true">
      <div class="bounce">
        <Art name="favicon" alt="" />
      </div>
      <p class="pt1">Đang mở hộp quà…</p>
    </main>
  );
}

export function LoginScreen({ onSignIn, busy, error }: { onSignIn: () => void; busy: boolean; error?: string | null }) {
  return (
    <main class="screen">
      <div class="ghost-voucher" aria-hidden="true">
        <img src={commonImg('voucherBlank')} alt="" />
        <img class="ghost-voucher__q blink" src={commonImg('revealQuestion')} alt="" />
      </div>
      <h1 class="pt2">Có quà cho bạn nè!</h1>
      <p class="lead">Đăng nhập bằng tài khoản Google mà Bá Lương đã gửi quà để mở nha.</p>
      <Button icon="iconLogin" onClick={onSignIn} disabled={busy}>
        {busy ? 'Đang đăng nhập…' : 'Đăng nhập với Google'}
      </Button>
      {error && (
        <p class="lead lead--warn" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}

export function InAppScreen() {
  const [copied, setCopied] = useState(false);
  const link = location.href;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // trình duyệt trong app có thể chặn clipboard: chọn sẵn chữ để người dùng tự copy
      const el = document.getElementById('inapp-link');
      if (el) getSelection()?.selectAllChildren(el);
    }
  };
  return (
    <main class="screen">
      <Art name="browserWarning" alt="Biểu tượng trình duyệt" />
      <h1 class="pt1">Mở bằng Chrome hoặc Safari nha</h1>
      <p class="lead">
        Trình duyệt trong Zalo / Messenger / Facebook không cho đăng nhập Google. Bấm <b>⋯</b> ở góc rồi chọn{' '}
        <b>Mở bằng trình duyệt</b>, hoặc copy link dán vào Chrome / Safari.
      </p>
      <p class="link-box" id="inapp-link">
        {link}
      </p>
      <Button icon={copied ? 'iconCheck' : undefined} onClick={copy}>
        {copied ? 'Đã copy!' : 'Copy link'}
      </Button>
    </main>
  );
}

export function EmptyScreen({ email, onSwitch }: { email: string; onSwitch: () => void }) {
  return (
    <main class="screen">
      <Art name="mascotEmpty" alt="Hộp quà trống" />
      <h1 class="pt1">Chưa có quà nào ở đây</h1>
      <p class="lead">
        Bạn đang đăng nhập bằng <b>{email}</b>. Có thể quà được gửi tới một email khác của bạn?
      </p>
      <Button variant="secondary" icon="iconLogout" onClick={onSwitch}>
        Đổi tài khoản
      </Button>
    </main>
  );
}

export function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main class="screen">
      <Art name="mascotError" alt="Đám mây có tia sét" />
      <h1 class="pt1">Ối, có gì đó trục trặc</h1>
      <p class="lead">{message} Kiểm tra mạng rồi thử lại nha.</p>
      <Button onClick={onRetry}>Thử lại</Button>
    </main>
  );
}
