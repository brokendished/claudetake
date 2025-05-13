'use client';

import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/">
              <a className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold">ClaudeTake</span>
              </a>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {!session && (
              <>
                <Link href="/login">
                  <a className="text-gray-700 hover:text-gray-900">Customer Login</a>
                </Link>
                <Link href="/contractor/login">
                  <a className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    Contractor Login
                  </a>
                </Link>
              </>
            )}
            {session && (
              <button
                onClick={() => signOut()}
                className="text-gray-700 hover:text-gray-900"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
