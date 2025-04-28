import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Customer Login</h1>
      <p className="text-sm text-gray-600 mb-4">
        This login is for customers to access their dashboard and manage their quotes.
        If you are a contractor, please use the <a href="/signup" className="text-blue-600 underline">Contractor Signup</a>.
      </p>
      <button
        onClick={() => signIn('google')}
        className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
      >
        Login with Google
      </button>
      <button
        onClick={() => signIn('email', { callbackUrl: '/dashboard' })}
        className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 mt-4"
      >
        Login with Email
      </button>
    </div>
  );
}
