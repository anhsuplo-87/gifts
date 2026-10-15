// Nhận diện trình duyệt nhúng trong app (Zalo, Messenger, Facebook, Instagram, Line…):
// đăng nhập Google bằng popup thường bị chặn ở đây, nên phải mời mở bằng Chrome/Safari.
const IN_APP_PATTERNS = [
  /Zalo/i,
  /FBAN|FBAV|FB_IAB|FBIOS/i, // Facebook / Messenger
  /Messenger/i,
  /Instagram/i,
  /\bLine\//i,
  /MicroMessenger/i, // WeChat
  /TikTok|musical_ly|Bytedance/i,
  /Twitter/i,
  /Snapchat/i,
  /; wv\)/i, // Android WebView
];

export function isInAppBrowser(ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): boolean {
  return IN_APP_PATTERNS.some((re) => re.test(ua));
}
