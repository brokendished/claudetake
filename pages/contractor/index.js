import { useRouter } from 'next/router';
import Link from 'next/link';

export default function ContractorLanding() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            ClaudeTake
          </Link>
          <div className="space-x-4">
            <Link href="/contractor/login" className="text-gray-600 hover:text-gray-900">
              Login
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Grow Your Contractor Business
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Get more leads and automate your quote process with AI
          </p>
          <div className="space-x-4">
            <Link 
              href="/contractor/signup"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700"
            >
              Start Free Trial
            </Link>
            <Link
              href="/contractor/demo"
              className="inline-block bg-gray-100 text-gray-800 px-8 py-3 rounded-lg hover:bg-gray-200"
            >
              View Demo
            </Link>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">AI-Powered Quotes</h3>
            <p className="text-gray-600">Automate your quote process with advanced AI technology</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Lead Generation</h3>
            <p className="text-gray-600">Convert more website visitors into qualified leads</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Custom Branding</h3>
            <p className="text-gray-600">White-label solution that matches your brand</p>
          </div>
        </div>
      </main>
    </div>
  );
}
