# gifts

Trang voucher quà tặng pixel — https://anhsuplo-87.github.io/gifts/

Vite + Preact + TypeScript, deploy lên GitHub Pages khi push `main`.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy local, mở `http://localhost:5173/gifts/` |
| `npm run build` | Kiểm tra kiểu + build ra `dist/` |
| `npm run check:fonts` | Liệt kê chữ tiếng Việt bị thiếu glyph trong từng font |
| `npm run test:rules` | Chạy test Firestore rules trên emulator |

Trang thử font: `http://localhost:5173/gifts/?fonts`.

## Font

- Font pixel tự tải (m5x7, m6x11 của Daniel Linssen): đặt file `.ttf` vào `public/fonts/`.
- Pixelify Sans, Geist Pixel, Nunito, Inter: self-host qua `@fontsource`.
- Thêm/đổi font thì chạy `node scripts/check-font-glyphs.mjs --write` để cập nhật
  `src/fonts/font-metrics.json` (cỡ gốc + glyph thiếu) cho trang thử font.

## Firestore rules

- Rules ở `firestore.rules`, test ở `tests/rules/` (Vitest + `@firebase/rules-unit-testing`).
- Chạy test cần **Java 21** và Firebase CLI (`npm i -g firebase-tools`). Project id tạm `demo-gifts`, chỉ chạy emulator.
- **UID admin:** sửa đúng một dòng trong `firestore.rules`:
  ```
  function adminUid() { return 'ADMIN_UID_PLACEHOLDER'; }
  ```
  Thay `ADMIN_UID_PLACEHOLDER` bằng UID thật (Firebase Console → Authentication → Users). Test tự thay dòng này bằng UID giả nên không cần sửa test.
- **Không deploy rules** lên Firebase thật trước Cổng 3.
