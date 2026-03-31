import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '可孚AI数字人',
  description: 'AI驱动的数字人视频生成平台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
