// Các màn phụ: đang tải, đăng nhập, trình duyệt trong app, chưa có quà, lỗi (SPEC §2.3, §3).
import { useState } from 'preact/hooks';
import { Button } from './Kit.tsx';
import { commonImg, u } from './tokens.ts';

function Art({ name, alt, size = 32, scale = 2 }: { name: 'mascotSad' | 'browserWarning' | 'favicon'; alt: string; size?: number; scale?: number }) {
  return <img class="art" src={commonImg(name)} alt={alt} style={{ width: u(size * scale), height: u(size * scale) }} />;
}

export function LoadingScreen() {
  return (
    <main class="screen" aria-busy="true">
      <div class="bounce">
        <Art name="favicon" alt="" />
      </div>
      <p class="pt">Đang mở hộp quà…</p>
    </main>
  );
}

export function LoginScreen({ onSignIn, busy }: { onSignIn: () => void; busy: boolean }) {
  return (
    <main class="screen">
      <div class="ghost-voucher" aria-hidden="true">
        <img src={commonImg('voucherBlank')} alt="" />
        <img class="ghost-voucher__q blink" src={commonImg('revealQuestion')} alt="" />
      </div>
      <h1 class="pt">Có quà cho bạn nè!</h1>
      <p class="lead">Đăng nhập bằng tài khoản Google mà Bá Lương đã gửi quà để mở nha.</p>
      <Button icon="iconLogin" onClick={onSignIn} disabled={busy}>
        {busy ? 'Đang đăng nhập…' : 'Đăng nhập với Google'}
      </Button>
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
      <h1 class="pt">Mở bằng Chrome hoặc Safari nha</h1>
      <p class="lead">
        Trình duyệt trong Zalo / Messenger / Facebook không cho đăng nhập Google. Bấm <b>⋯</b> ở góc rồi chọn{' '}
        <b>Mở bằng trình duyệt</b>, hoặc copy link dán vào Chrome/Safari.
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
      <Art name="mascotSad" alt="Mặt buồn" />
      <h1 class="pt">Chưa có quà nào ở đây</h1>
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
      <Art name="mascotSad" alt="Mặt buồn" />
      <h1 class="pt">Ối, có gì đó trục trặc</h1>
      <p class="lead">{message} Kiểm tra mạng rồi thử lại nha.</p>
      <Button onClick={onRetry}>Thử lại</Button>
    </main>
  );
}
