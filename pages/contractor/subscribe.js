import { useState } from 'react';

export default function ContractorSubscribe() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/contractor/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to subscribe');
      }

      alert('Subscription successful!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Choose Your Subscription Plan</h1>
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
      >
        {loading ? 'Processing...' : 'Subscribe Now'}
      </button>
      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
    </div>
  );
}
