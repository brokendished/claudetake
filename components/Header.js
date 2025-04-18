'use client';

import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="w-full bg-black text-white shadow-md py-4 px-6 flex items-center justify-between">
      {/* Left (empty for spacing or use later) */}
      <div className="w-1/3" />

      {/* Center: Logo */}
      <div className="w-1/3 text-center">
        <Link href="/">
          <span className="text-xl font-bold tracking-wide">GetQuote</span>
        </Link>
      </div>

      {/* Right: Auth / Dashboard */}
      <div className="w-1/3 flex justify-end items-center gap-3">
        {session?.user && (
          <Link
            href="/dashboard"
            className="bg-white text-black px-3 py-1 text-sm rounded-full hover:bg-gray-200 transition"
          >
            Dashboard
          </Link>
        )}
        {session?.user ? (
          <button
            onClick={() => signOut()}
            className="text-sm hover:underline"
          >
            Sign out
          </button>
        ) : (
          <button
            onClick={() => signIn('google')}
            className="text-sm hover:underline"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
