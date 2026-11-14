import type { Metadata } from 'next';
import './globals.css';
import { WorkspaceProvider } from '@/components/workspace-context';
import { AppShell } from '@/components/app-shell';

export const metadata: Metadata = { title: 'Career360 | Your opportunity workspace', description: 'Connect what you offer with what the world needs. Build your Opportunity DNA, discover complementary opportunities and take your next step.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <WorkspaceProvider>
          <AppShell>{children}</AppShell>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
