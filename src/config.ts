// Cấu hình Firebase (SPEC §7). Config web của Firebase là công khai theo thiết kế — được commit.
// Bảo vệ dữ liệu nằm ở firestore.rules, không ở đây.

export const firebaseConfig = {
  apiKey: 'AIzaSyA4vx-2oqCjJeoZb0rI3Un4RYkz38LFsFU',
  authDomain: 'gifts-anhsuplo.firebaseapp.com',
  projectId: 'gifts-anhsuplo',
  storageBucket: 'gifts-anhsuplo.firebasestorage.app',
  messagingSenderId: '442686985857',
  appId: '1:442686985857:web:dced610b4ba794f7d79f80',
};

/** Có đủ config để chạy Firebase thật không (thiếu thì app hiện màn "Chưa cấu hình") */
export const hasFirebaseConfig = () => !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

/**
 * Dùng emulator khi chạy `npm run dev` (dev) hoặc có `?emu` trên URL.
 * `?prod` trên bản dev thì dùng Firebase thật.
 */
export function useEmulator(): boolean {
  const q = new URLSearchParams(location.search);
  if (q.has('prod')) return false;
  return import.meta.env.DEV || q.has('emu');
}

/** Project id cho emulator: "demo-…" → emulator không bao giờ chạm vào project thật */
export const EMULATOR_PROJECT_ID = 'demo-gifts';

/**
 * UID của admin (Bá Lương). Thay bằng UID thật ở Cổng 3 — cùng lúc với dòng adminUid() trong
 * firestore.rules. Trên emulator dùng UID giả 'admin-test' (scripts/seed-emulator.mjs tạo sẵn).
 */
export const ADMIN_UID_PROD = 'ADMIN_UID_PLACEHOLDER';
export const ADMIN_UID_EMULATOR = 'admin-test';
export const adminUid = () => (useEmulator() ? ADMIN_UID_EMULATOR : ADMIN_UID_PROD);
