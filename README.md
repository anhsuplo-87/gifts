# gifts

Trang voucher quà tặng pixel — https://anhsuplo-87.github.io/gifts/

Vite + Preact + TypeScript, deploy lên GitHub Pages khi push `main`.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy local, mở `http://localhost:5173/gifts/` (bản dev nối emulator; cần `dev:emu` đang chạy, hoặc dùng `?mock=`) |
| `npm run dev:emu` | Bật Auth + Firestore Emulator, nạp dữ liệu giả, rồi chạy Vite ở `http://127.0.0.1:5173/gifts/` |
| `npm run seed:emu` | Nạp lại dữ liệu giả vào emulator đang chạy |
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

## Firebase

- Config ở `src/config.ts` (config web Firebase là công khai theo thiết kế; dữ liệu được bảo vệ bằng `firestore.rules`).
- Không có `?mock` trên URL → app dùng Firebase: bản build dùng project thật `gifts-anhsuplo`;
  `npm run dev` hoặc URL có `?emu` → dùng **emulator** (project `demo-gifts`, không chạm project thật).
  `?prod` trên bản dev → dùng project thật.
- Firebase được tải động (chunk riêng), trang `?mock=` không tải Firebase.

### Chạy với emulator

```
npm run dev:emu
```
Seed tạo 6 tài khoản Google giả (không có email thật):

| Email | Dữ liệu |
|---|---|
| `designer@test.local` | 8 ô, 6 sticker, 2 đã dán (1 cái dán 1 giờ trước → bóc được) |
| `gamer@test.local` | 1 ô, 6 game |
| `reveal@test.local` | Chưa tiết lộ |
| `nhom@test.local` | 5 ô, sticker có số lượng: "Bộ Font Family" ×3 (đã dán 1) + 2 sticker lẻ |
| `moi@test.local` | Chưa có voucher — để admin tạo thử rồi đăng nhập kiểm tra |
| `admin@test.local` | **UID `admin-test`** → vào `#/admin` |

Đăng nhập: bấm "Đăng nhập với Google" → cửa sổ của Auth Emulator → chọn tài khoản. Lối tắt để test (chỉ trên emulator):
mở `http://127.0.0.1:5173/gifts/?as=designer@test.local` rồi bấm đăng nhập (không cần popup). Email khác (vd `la@test.local`) → màn "Chưa có quà".
Mở 2 tài khoản cùng lúc: tab `http://127.0.0.1:5173/…` và tab `http://localhost:5173/…` là hai origin khác nhau nên giữ 2 phiên đăng nhập riêng.
Rules trong emulator lấy từ `firestore.rules`, chỉ thay UID admin thành `admin-test` lúc nạp (file không bị sửa).

## Admin (`#/admin`, chỉ UID admin)

- `#/admin`: khối **Mới dán** (realtime, 20 lần dán gần nhất — cần index `items` collection group trong `firestore.indexes.json`) và danh sách voucher.
- `#/admin/new`, `#/admin/v/<email>`: form voucher + xem trước thẻ trực tiếp (cảnh báo tên tràn dòng), sticker theo nhóm
  (số lượng ×N, lên/xuống, sửa áp dụng cả nhóm, upload PNG/GIF ≤ 100 KB, cạnh ≤ 96px), admin dán/bóc thay,
  Reset tiết lộ, Xem như bạn bè (`#/admin/v/<email>/xem`, chỉ đọc), Xoá voucher (gõ lại email).
- Code admin nằm ở `src/admin/**` + `src/data/admin.ts`, tải riêng (lazy) — trang bạn bè không tải.

## Firestore rules

- Rules ở `firestore.rules`, test ở `tests/rules/` (Vitest + `@firebase/rules-unit-testing`).
- Chạy test cần **Java 21** và Firebase CLI (`npm i -g firebase-tools`). Project id tạm `demo-gifts`, chỉ chạy emulator.
- **UID admin** (đã đặt ở Cổng 3) nằm ở **hai chỗ**, đổi thì sửa cả hai cho khớp:
  - `firestore.rules`: `function adminUid() { return '<UID>'; }`
  - `src/config.ts`: `ADMIN_UID_PROD = '<UID>'`

  UID lấy ở Firebase Console → Authentication → Users. Test và emulator tự thay UID giả nên không cần sửa.
- **Deploy rules + indexes** (thủ công, sau khi `npm run test:rules` xanh):
  `firebase deploy --only firestore:rules,firestore:indexes --project gifts-anhsuplo`
