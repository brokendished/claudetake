import { signIn } from 'next-auth/react';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Welcome Back</h2>
          <p className="mt-2 text-gray-600">Choose your login method</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Login as Customer with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>

          <Link href="/contractor/login">
            <a className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-black bg-white hover:bg-gray-50">
              Login as Contractor
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
