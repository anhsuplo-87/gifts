// Router hash tối giản (SPEC §3): #/  ·  #/admin  ·  #/admin/new  ·  #/admin/v/<email>  ·  #/admin/v/<email>/xem
import { useEffect, useState } from 'preact/hooks';

export type Route =
  | { name: 'home' }
  | { name: 'admin' }
  | { name: 'adminNew' }
  /** Sửa voucher */
  | { name: 'adminEdit'; email: string }
  /** Xem như bạn bè (chỉ đọc) */
  | { name: 'adminPreview'; email: string };

export function parseHash(hash = location.hash): Route {
  const h = hash.replace(/^#/, '');
  if (h === '/admin/new') return { name: 'adminNew' };
  const m = /^\/admin\/v\/([^/]+)(\/xem)?\/?$/.exec(h);
  if (m) {
    const email = decodeURIComponent(m[1]).toLowerCase();
    return m[2] ? { name: 'adminPreview', email } : { name: 'adminEdit', email };
  }
  if (h === '/admin' || h.startsWith('/admin/')) return { name: 'admin' };
  return { name: 'home' };
}

export function hrefFor(r: Route): string {
  switch (r.name) {
    case 'admin':
      return '#/admin';
    case 'adminNew':
      return '#/admin/new';
    case 'adminEdit':
      return `#/admin/v/${encodeURIComponent(r.email)}`;
    case 'adminPreview':
      return `#/admin/v/${encodeURIComponent(r.email)}/xem`;
    default:
      return '#/';
  }
}

/** Đổi route; replace = không thêm vào lịch sử */
export function navigate(r: Route, replace = false) {
  const href = hrefFor(r);
  if (location.hash === href) return;
  if (replace) {
    const url = new URL(location.href);
    url.hash = href;
    history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else location.hash = href;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash());
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
