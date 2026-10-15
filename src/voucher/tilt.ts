// Quyền đọc độ nghiêng máy (deviceorientation).
// iOS bắt xin quyền bằng DeviceOrientationEvent.requestPermission() trong một cú chạm;
// Android thì không cần. Bị từ chối thì thôi, không hỏi lại (nhớ trong localStorage).

export type TiltState = 'unknown' | 'granted' | 'denied' | 'unsupported';

const KEY = 'gifts.tilt';
type PermissionFn = () => Promise<'granted' | 'denied'>;
const needsPermission = () =>
  typeof DeviceOrientationEvent !== 'undefined' &&
  typeof (DeviceOrientationEvent as unknown as { requestPermission?: PermissionFn }).requestPermission === 'function';

function initial(): TiltState {
  if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') return 'unsupported';
  if (!needsPermission()) return 'granted';
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'denied') return 'denied';
    // iOS: quyền "granted" không nhớ qua lần tải trang → phải hỏi lại trong cú chạm kế tiếp
  } catch {
    /* localStorage bị chặn */
  }
  return 'unknown';
}

let state: TiltState = initial();
const subs = new Set<(s: TiltState) => void>();

export const tiltState = () => state;
export function onTiltState(cb: (s: TiltState) => void) {
  subs.add(cb);
  return () => void subs.delete(cb);
}
function setState(s: TiltState) {
  state = s;
  subs.forEach((cb) => cb(s));
}

/** Gọi TRONG handler của một cú chạm (tiết lộ / chạm thẻ lần đầu). Không làm gì nếu đã có kết quả. */
export function requestTiltPermission() {
  if (state !== 'unknown') return;
  const fn = (DeviceOrientationEvent as unknown as { requestPermission?: PermissionFn }).requestPermission;
  if (!fn) return setState('granted');
  fn.call(DeviceOrientationEvent)
    .then((r) => {
      setState(r === 'granted' ? 'granted' : 'denied');
      if (r !== 'granted') {
        try {
          localStorage.setItem(KEY, 'denied');
        } catch {
          /* bỏ qua */
        }
      }
    })
    .catch(() => setState('denied'));
}

/** Thiết bị không có chuột (điện thoại / máy tính bảng) */
export const isTouchOnly = () => typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches;
