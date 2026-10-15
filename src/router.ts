// Router hash tối giản (SPEC §3): #/  ·  #/admin  ·  #/admin/v/<email>
import { useEffect, useState } from 'preact/hooks';

export type Route = { name: 'home' } | { name: 'admin' } | { name: 'adminPreview'; email: string };

export function parseHash(hash = location.hash): Route {
  const h = hash.replace(/^#/, '');
  const m = /^\/admin\/v\/(.+)$/.exec(h);
  if (m) return { name: 'adminPreview', email: decodeURIComponent(m[1]).toLowerCase() };
  if (h === '/admin' || h.startsWith('/admin/')) return { name: 'admin' };
  return { name: 'home' };
}

export const hrefFor = (r: Route) =>
  r.name === 'admin' ? '#/admin' : r.name === 'adminPreview' ? `#/admin/v/${encodeURIComponent(r.email)}` : '#/';

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
