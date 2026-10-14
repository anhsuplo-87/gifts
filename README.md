# gifts

Trang voucher quà tặng pixel — https://anhsuplo-87.github.io/gifts/

Vite + Preact + TypeScript, deploy lên GitHub Pages khi push `main`.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy local, mở `http://localhost:5173/gifts/` |
| `npm run build` | Kiểm tra kiểu + build ra `dist/` |
| `npm run check:fonts` | Liệt kê chữ tiếng Việt bị thiếu glyph trong từng font |

Trang thử font: `http://localhost:5173/gifts/?fonts`.

## Font

- Font pixel tự tải (m5x7, m6x11 của Daniel Linssen): đặt file `.ttf` vào `public/fonts/`.
- Pixelify Sans, Geist Pixel, Nunito, Inter: self-host qua `@fontsource`.
- Thêm/đổi font thì chạy `node scripts/check-font-glyphs.mjs --write` để cập nhật
  `src/fonts/font-metrics.json` (cỡ gốc + glyph thiếu) cho trang thử font.
