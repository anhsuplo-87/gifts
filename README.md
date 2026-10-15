# gifts

Trang voucher quà tặng pixel — https://anhsuplo-87.github.io/gifts/

Vite + Preact + TypeScript, deploy lên GitHub Pages khi push `main`.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy local, mở `http://localhost:5173/gifts/` |
| `npm run build` | `check:assets` + kiểm tra kiểu + build ra `dist/` |
| `npm run gen:placeholders` | Sinh hình placeholder còn thiếu trong `public/assets/ui/` (`-- --force` để ghi đè tất cả) |
| `npm run check:assets` | Báo lỗi nếu hình thiếu / sai kích thước, hoặc số trong `layout.ts` không khớp nhau |
| `npm run test:rules` | Chạy test Firestore rules trên emulator |


## Prototype dữ liệu giả (`?mock=`)

Chưa nối Firebase: trang luôn dùng `MockRepo` (`src/data/mock.ts`), mặc định `?mock=login`.
Có `?mock` trên URL thì góc phải dưới có thanh chọn chế độ.

| `?mock=` | Màn |
|---|---|
| `login` | Đăng nhập (bấm → `reveal`) |
| `inapp` | Mở bằng Chrome/Safari + copy link |
| `reveal` | Voucher designer chưa tiết lộ |
| `designer` | 8 ô, 6 sticker, 2 đã dán (1 cái dán 1 giờ trước → bóc được) |
| `designer-full` | Đã dán đủ 8 ô, đã quá hạn |
| `gamer` | 1 ô, 6 game |
| `gamer-done` | 1 ô đã chọn |
| `empty` | Chưa có quà |
| `error` | Lỗi tải + thử lại |
| `flaky` | Như `designer` nhưng khoảng 1/3 thao tác bị lỗi giả |

### Hiệu ứng (`?fx=`)

- Mặc định (`smooth`, học từ repo *harmonies* + *master-thesis-graduation-invitation*): thẻ nghiêng 3D theo
  con trỏ / chạm-kéo (tối đa 9° ở góc), các lớp trượt mượt; lật 3D; bấm thẻ thì "bong bóng".
  **Chỉ resample khi đang nghiêng / đang lật** — đứng yên thì thẻ phẳng, không còn transform, nằm đúng pixel.
- `?fx=pixel`: bản cũ — lật 2D theo bước, lớp dịch làm tròn theo pixel gốc. Ghép được với `?mock=`, ví dụ `?mock=designer&fx=pixel`.
- **Chế độ tập trung:** chọn sticker → nền mờ, thẻ lật ra mặt sau và đứng yên (không nghiêng, không nhấp nhô),
  ô trống nhấp nháy. Thoát: chạm nền mờ, Esc, nút "Thôi", hoặc dán xong.
- Thông số chuyển động: `MOTION` trong `src/voucher/layout.ts`.

## Kích thước & hình

- Mọi kích thước voucher / ô / sticker / vùng chữ: `src/voucher/layout.ts` (đơn vị pixel gốc).
- Danh sách hình (tên, kích thước, slice): `src/voucher/assets.ts` — dùng chung cho UI, `gen:placeholders`, `check:assets`.
- Bảng màu theme: `src/voucher/themes.ts` — sinh CSS tokens `[data-theme=…]` và dùng cho placeholder.
- Đổi kích thước: sửa `layout.ts` → `npm run gen:placeholders -- --force` → `npm run build`.
  (`--force` ghi đè cả hình vẽ thật — chỉ dùng khi chưa có hình, hoặc xoá riêng file cần sinh lại.)

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
