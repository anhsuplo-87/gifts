# gifts

Trang voucher quà tặng pixel — https://anhsuplo-87.github.io/gifts/

Vite + Preact + TypeScript, deploy lên GitHub Pages khi push `main`.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy local, mở `http://localhost:5173/gifts/` |
| `npm run build` | Kiểm tra kiểu + build ra `dist/` |
| `npm run test:rules` | Chạy test Firestore rules trên emulator |


## Font

- Chữ pixel: **dearpix-2-01** (`public/fonts/dearpix-2-01/`), cỡ gốc 16px, luôn vẽ ở `16px × --px`.
- Chữ nội dung: **Nunito** qua `@fontsource/nunito` (subset latin + vietnamese).
- Font thử nghiệm khác để trong `public/fonts/_unused/` (bị `.gitignore`, chỉ ở máy).
  Trang thử font `?fonts` chỉ có khi chạy `npm run dev`.
- `node scripts/check-font-glyphs.mjs --write`: đếm chữ tiếng Việt thiếu glyph + đo cỡ gốc.

### Giấy phép font

| Font | Tác giả | Giấy phép | Nguồn |
|---|---|---|---|
| dearpix-2-01 | ygygfu (Fontstruct) | SIL OFL 1.1 — `license.txt` trong thư mục | https://fontstruct.com/fontstructions/show/2872297 |
| Nunito | Vernon Adams, Cyreal | SIL OFL 1.1 | https://fontsource.org/fonts/nunito |

## Firestore rules

- Rules ở `firestore.rules`, test ở `tests/rules/` (Vitest + `@firebase/rules-unit-testing`).
- Chạy test cần **Java 21** và Firebase CLI (`npm i -g firebase-tools`). Project id tạm `demo-gifts`, chỉ chạy emulator.
- **UID admin:** sửa đúng một dòng trong `firestore.rules`:
  ```
  function adminUid() { return 'ADMIN_UID_PLACEHOLDER'; }
  ```
  Thay `ADMIN_UID_PLACEHOLDER` bằng UID thật (Firebase Console → Authentication → Users). Test tự thay dòng này bằng UID giả nên không cần sửa test.
- **Không deploy rules** lên Firebase thật trước Cổng 3.
