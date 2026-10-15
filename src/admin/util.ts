// Tiện ích cho admin: đo tràn dòng chữ trên thẻ, kiểm tra ảnh sticker, thời gian tương đối.
import { useEffect, useState } from 'preact/hooks';
import { FONT, FRONT } from '../voucher/layout.ts';

// ───────── Đo chữ (canvas measureText, dearpix 16px, mỗi dòng 148px) ─────────

const CSS_FONT = `${FONT.basePx}px '${FONT.family}'`;
let ctx: CanvasRenderingContext2D | null = null;
const measure = (s: string) => {
  ctx ??= document.createElement('canvas').getContext('2d')!;
  ctx.font = CSS_FONT;
  return ctx.measureText(s).width;
};

/** Font pixel đã tải chưa (đo trước khi tải xong sẽ sai) */
export function useFontReady(): boolean {
  const [ready, setReady] = useState(() => document.fonts.check(CSS_FONT));
  useEffect(() => {
    if (ready) return;
    let alive = true;
    document.fonts.load(CSS_FONT).then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

/** Số dòng khi xuống dòng theo từ như CSS (white-space: normal; overflow-wrap: anywhere) */
export function countLines(text: string, width: number = FRONT.title.w): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  let lines = 1;
  let line = '';
  for (const w of words) {
    const tryLine = line ? `${line} ${w}` : w;
    if (measure(tryLine) <= width) {
      line = tryLine;
      continue;
    }
    if (line) lines++;
    // từ dài hơn cả dòng: bẻ theo ký tự
    line = '';
    for (const ch of w) {
      if (line && measure(line + ch) > width) {
        lines++;
        line = ch;
      } else line += ch;
    }
  }
  return lines;
}

/** Chữ một dòng có vượt bề rộng không */
export const overflowsLine = (text: string, width: number = FRONT.recipient.w) => measure(text.trim()) > width;

// ───────── Ảnh sticker: PNG/GIF, ≤ 100 KB, cạnh ≤ 96px → data URL ─────────

export const IMG_MAX_BYTES = 100 * 1024;
export const IMG_MAX_SIDE = 96;

export type StickerImage = { dataUrl: string; w: number; h: number; bytes: number };

export async function readStickerImage(file: File): Promise<StickerImage> {
  if (file.type !== 'image/png' && file.type !== 'image/gif') throw new Error(`Chỉ nhận PNG hoặc GIF (file này là ${file.type || 'không rõ định dạng'}).`);
  if (file.size > IMG_MAX_BYTES) throw new Error(`Ảnh ${Math.ceil(file.size / 1024)} KB — tối đa 100 KB.`);
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error('Không đọc được file.'));
    r.readAsDataURL(file);
  });
  const { w, h } = await new Promise<{ w: number; h: number }>((res, rej) => {
    const img = new Image();
    img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => rej(new Error('File ảnh hỏng hoặc không đúng định dạng.'));
    img.src = dataUrl;
  });
  if (w > IMG_MAX_SIDE || h > IMG_MAX_SIDE) throw new Error(`Ảnh ${w}×${h}px — mỗi cạnh tối đa ${IMG_MAX_SIDE}px.`);
  return { dataUrl, w, h, bytes: file.size };
}

/** Kích thước ảnh data URL (để nhắc khi khác cỡ sticker chuẩn) */
export function useImageSize(src: string | null): { w: number; h: number } | null {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    setSize(null);
    if (!src) return;
    const img = new Image();
    img.onload = () => setSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }, [src]);
  return size;
}

// ───────── Thời gian ─────────

/** Đồng hồ tự cập nhật (cho "x phút trước") */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function timeAgo(d: Date | null, now = Date.now()): string {
  if (!d) return '';
  const s = Math.max(0, (now - d.getTime()) / 1000);
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return `${Math.floor(s / 86400)} ngày trước`;
}

export const fmtDateTime = (d: Date) =>
  d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

/** Date ↔ giá trị <input type="date"> (giờ địa phương) */
export const toDateInput = (d: Date | null) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
export function fromDateInput(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
