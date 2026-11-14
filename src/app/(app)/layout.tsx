'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { WorkspaceProvider, useWorkspace } from '@/components/workspace-context';
import { AppShell } from '@/components/app-shell';

function Guard({ children }: { children: React.ReactNode }) {
  const { loading, email } = useWorkspace();
  useEffect(() => {
    if (!loading && !email) window.location.assign('/signin?next=' + encodeURIComponent(window.location.pathname));
  }, [loading, email]);

  if (loading || !email) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 text-slate-500">
        <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
        {loading ? 'Loading…' : 'Taking you to sign in…'}
      </div>
    );
  }
  return <>{children}</>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <Guard>
        <AppShell>{children}</AppShell>
      </Guard>
    </WorkspaceProvider>
  );
}
