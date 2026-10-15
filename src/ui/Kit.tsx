// UI chrome (SPEC §7): nút, nút icon, hộp thoại, thông báo nhỏ — dearpix ×1, khung 9-slice viền pixel 2px.
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
}) {
  const { variant = 'primary', icon, onClick, disabled, children, label } = props;
  return (
    <button type="button" class={`pbtn pbtn--${variant}`} onClick={onClick} disabled={disabled} aria-label={label}>
      {icon && <Icon name={icon} />}
      <span class="pt1">{children}</span>
    </button>
  );
}

/** Nút chỉ có icon, không khung (header, nút lật nhỏ dưới thẻ) */
export function IconButton(props: { icon: IconKey; label: string; onClick: () => void; faint?: boolean }) {
  return (
    <button type="button" class={`icon-btn${props.faint ? ' icon-btn--faint' : ''}`} aria-label={props.label} title={props.label} onClick={props.onClick}>
      <Icon name={props.icon} />
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
        <h2 class="pt1 dialog__title" id={props.labelId}>
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
