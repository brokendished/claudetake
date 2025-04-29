import { useEffect, useState } from 'react';

export default function ContractorDashboard() {
  const [personalizedLink, setPersonalizedLink] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContractorData = async () => {
      try {
        const res = await fetch('/api/contractor/dashboard');
        if (!res.ok) {
          throw new Error('Failed to fetch contractor data');
        }
        const data = await res.json();
        setPersonalizedLink(data.personalizedLink);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContractorData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Contractor Dashboard</h1>
      <p className="mb-4">Your personalized link:</p>
      <div className="bg-white p-4 rounded shadow-md">
        <a
          href={personalizedLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          {personalizedLink}
        </a>
      </div>
      <button
        onClick={() => alert('Settings management coming soon!')}
        className="mt-4 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
      >
        Manage Settings
      </button>
    </div>
  );
}
