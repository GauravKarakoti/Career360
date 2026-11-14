import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Career360 | Your opportunity workspace', description: 'Connect what you offer with what the world needs. Build your Opportunity DNA, discover complementary opportunities and take your next step.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
