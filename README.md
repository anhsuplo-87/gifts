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

- Font pixel tự tải: đặt file `.ttf`/`.otf` vào `public/fonts/` (được để trong thư mục con).
- Pixelify Sans, Geist Pixel, Nunito, Inter: self-host qua `@fontsource` (SIL OFL 1.1).
- Thêm/đổi font thì chạy `node scripts/check-font-glyphs.mjs --write` để cập nhật
  `src/fonts/font-metrics.json` (cỡ gốc + glyph thiếu) cho trang thử font.

### Giấy phép font trong `public/fonts/`

| Font | Tác giả | Giấy phép | Nguồn |
|---|---|---|---|
| m5x7 | Daniel Linssen | CC0 1.0 ("free to use but attribution appreciated") | https://managore.itch.io/m5x7 |
| m6x11, m6x11plus | Daniel Linssen | "Free to use with attribution" — **phải ghi công** nếu dùng | https://managore.itch.io/m6x11 |
| dearpix-1-94, dearpix-2-01 | ygygfu (Fontstruct) | SIL OFL 1.1 — `license.txt` trong thư mục | https://fontstruct.com/fontstructions/show/2815314 · https://fontstruct.com/fontstructions/show/2872297 |
| kvn-97 | Kiên Trung (Fontstruct) | SIL OFL 1.1 — `license.txt` trong thư mục | https://fontstruct.com/fontstructions/show/2305827 |
| SVN-Determination Sans | Haley Wakamatsu; Việt hoá: STYLEno.1 Fonts | Theo trang tải: "Font miễn phí cho mọi mục đích sử dụng" — xem `SOURCE.md` trong thư mục | https://www.svnfont.com/viet-hoa-svn-determination-sans/ |

## Firestore rules

- Rules ở `firestore.rules`, test ở `tests/rules/` (Vitest + `@firebase/rules-unit-testing`).
- Chạy test cần **Java 21** và Firebase CLI (`npm i -g firebase-tools`). Project id tạm `demo-gifts`, chỉ chạy emulator.
- **UID admin:** sửa đúng một dòng trong `firestore.rules`:
  ```
  function adminUid() { return 'ADMIN_UID_PLACEHOLDER'; }
  ```
  Thay `ADMIN_UID_PLACEHOLDER` bằng UID thật (Firebase Console → Authentication → Users). Test tự thay dòng này bằng UID giả nên không cần sửa test.
- **Không deploy rules** lên Firebase thật trước Cổng 3.
