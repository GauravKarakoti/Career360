import Link from 'next/link';
import { Dna } from 'lucide-react';
import { SignInForm } from '@/components/auth-forms';

export const metadata = { title: 'Sign in | Career360' };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Dna aria-hidden className="h-5 w-5" />
        </span>
        <span className="text-base font-bold text-slate-900">Career360</span>
      </Link>
      <SignInForm next={next} />
    </main>
  );
}
