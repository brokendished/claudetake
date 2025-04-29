import { useState } from 'react';
import { useRouter } from 'next/router';

export default function ContractorSettings() {
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch('/api/contractor/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, businessName }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      router.push('/contractor/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Contractor Settings</h1>
      <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
            Business Name
          </label>
          <input
            type="text"
            id="businessName"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            required
          />
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
        >
          Save Settings
        </button>
      </form>
    </div>
  );
}
