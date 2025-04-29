import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import ChatbotChat from '../../components/ChatbotChat';

export default function ContractorChatPage() {
  const router = useRouter();
  const { contractorId } = router.query; // Ensure contractorId is used consistently
  const [contractorData, setContractorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!contractorId) return;

    const fetchContractorData = async () => {
      try {
        const res = await fetch(`/api/contractor/${contractorId}`); // Ensure endpoint uses contractorId
        if (!res.ok) {
          throw new Error('Failed to fetch contractor data');
        }
        const data = await res.json();
        setContractorData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContractorData();
  }, [contractorId]); // Ensure contractorId is used consistently

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">{contractorData.businessName}</h1>
      {contractorData.logo && (
        <img
          src={contractorData.logo}
          alt={`${contractorData.businessName} Logo`}
          className="mb-4 w-32 h-32 object-contain"
        />
      )}
      <p className="mb-4">{contractorData.greeting}</p>
      <div className="w-full max-w-3xl">
        <ChatbotChat role="customer" />
      </div>
    </div>
  );
}