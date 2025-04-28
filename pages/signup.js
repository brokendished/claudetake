import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';

export default function Signup() {
  const router = useRouter();

  const handleGoogleSignup = async () => {
    try {
      await signIn('google');
      router.push('/contractor/account-setup');
    } catch (error) {
      console.error('Error signing up with Google:', error);
      alert('Error signing up: ' + error.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 px-4">
      <div className="bg-white shadow-lg rounded-lg p-6 max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-4">Contractor Signup</h1>
        <p className="text-sm text-gray-600 text-center mb-6">
          Sign in with Google to create your contractor account and start customizing your experience.
        </p>
        <button
          onClick={handleGoogleSignup}
          className="w-full bg-blue-600 text-white py-2 rounded-lg shadow hover:bg-blue-700 transition"
        >
          Sign Up with Google
        </button>
      </div>
    </div>
  );
}
