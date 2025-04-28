import { useEffect, useState } from 'react';
import { auth, db } from '../../firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/router';

export default function ContractorHome() {
  const router = useRouter();
  const [contractorData, setContractorData] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push('/signup'); // Redirect to signup if not authenticated
    }
  }, []);

  useEffect(() => {
    const fetchContractorData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          setContractorData(docSnap.data());
        } else {
          throw new Error('Contractor data not found');
        }
      } catch (error) {
        console.error('Error fetching contractor data:', error);
        alert('Error fetching contractor data: ' + error.message);
      }
    };

    fetchContractorData();
  }, []);

  if (!contractorData) {
    return <p>Loading...</p>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Welcome, {contractorData.companyName}</h1>
      <div className="space-y-4">
        <button
          onClick={() => router.push('/contractor/quotes')}
          className="w-full bg-blue-600 text-white py-2 rounded-lg shadow hover:bg-blue-700 transition"
        >
          View Quotes
        </button>
        <button
          onClick={() => router.push('/contractor/settings')}
          className="w-full bg-gray-600 text-white py-2 rounded-lg shadow hover:bg-gray-700 transition"
        >
          Settings
        </button>
      </div>
    </div>
  );
}
