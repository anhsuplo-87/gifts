// Nút, hộp thoại, thông báo nhỏ — khung 9-slice lấy từ manifest asset.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { COMMON_ASSETS } from '../voucher/assets.ts';
import { commonImg } from './tokens.ts';

type IconKey = Extract<keyof typeof COMMON_ASSETS, `icon${string}`>;

export function Icon({ name }: { name: IconKey }) {
  return <img class="icon" src={commonImg(name)} alt="" aria-hidden="true" />;
}

export function Button(props: {
  variant?: 'primary' | 'secondary';
  icon?: IconKey;
  onClick?: () => void;
  disabled?: boolean;
  children: ComponentChildren;
  label?: string;
  small?: boolean;
  /** Ẩn chữ ở màn hẹp, chỉ còn icon (chữ vẫn đọc được bằng trình đọc màn hình) */
  compact?: boolean;
}) {
  const { variant = 'primary', icon, onClick, disabled, children, label, small, compact } = props;
  return (
    <button
      type="button"
      class={`pbtn pbtn--${variant}${small ? ' pbtn--small' : ''}${compact ? ' pbtn--compact' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      {icon && <Icon name={icon} />}
      <span class="pt">{children}</span>
    </button>
  );
}

export function Dialog(props: { title: ComponentChildren; children?: ComponentChildren; actions: ComponentChildren; onClose: () => void; labelId: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    // focus nút đầu tiên trong hộp thoại
    box.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
      if (e.key === 'Tab' && box.current) {
        // giữ focus trong hộp thoại
        const els = [...box.current.querySelectorAll<HTMLElement>('button:not([disabled])')];
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
        else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, []);
  return (
    <div class="overlay" onClick={(e) => e.target === e.currentTarget && props.onClose()}>
      <div class="dialog frame-dialog" role="dialog" aria-modal="true" aria-labelledby={props.labelId} ref={box}>
        <h2 class="pt dialog__title" id={props.labelId}>
          {props.title}
        </h2>
        {props.children && <div class="dialog__body">{props.children}</div>}
        <div class="dialog__actions">{props.actions}</div>
      </div>
    </div>
  );
}

export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [text]);
  return (
    <div class="toast frame-tray" role="status">
      {text}
    </div>
  );
}
