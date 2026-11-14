import Link from 'next/link';
import { Dna } from 'lucide-react';
import { SignUpForm } from '@/components/auth-forms';

export const metadata = { title: 'Sign up | Career360' };

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Dna aria-hidden className="h-5 w-5" />
        </span>
        <span className="text-base font-bold text-slate-900">Career360</span>
      </Link>
      <SignUpForm />
    </main>
  );
}
