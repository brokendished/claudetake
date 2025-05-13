'use client';

import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <Link href="/" className="flex-shrink-0 flex items-center">
            <span className="text-xl font-bold">ClaudeTake</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            {!session ? (
              <button
                onClick={() => signIn('google')}
                className="text-gray-700 hover:text-gray-900"
              >
                Sign In
              </button>
            ) : (
              <>
                <Link 
                  href="/dashboard"
                  className="text-gray-700 hover:text-gray-900"
                >
                  My Quotes
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-gray-700 hover:text-gray-900"
                >
                  Sign Out
                </button>
              </>
            )}
            <Link 
              href="/contractor"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              For Contractors
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
