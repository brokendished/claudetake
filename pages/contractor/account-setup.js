import { useState } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../../firebase-config';
import { doc, updateDoc } from 'firebase/firestore';

export default function AccountSetup() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      // Update contractor details in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        companyName,
        industry,
        companySize,
        chatbotSettings: {
          welcomeMessage: `Welcome to ${companyName}! How can we assist you today?`,
          saveQuoteMessage: 'Your quote has been saved successfully!',
        },
      });

      // Redirect to contractor account home page
      router.push('/contractor/home');
    } catch (error) {
      console.error('Error saving account setup:', error);
      alert('Error saving account setup: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Account Setup</h1>
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
        <input
          type="text"
          placeholder="Company Name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          className="w-full border p-2 rounded"
        />
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          required
          className="w-full border p-2 rounded"
        >
          <option value="">Select Industry</option>
          <option value="power-washing">Power Washing</option>
          <option value="landscaping">Landscaping</option>
          <option value="other">Other</option>
        </select>
        <select
          value={companySize}
          onChange={(e) => setCompanySize(e.target.value)}
          required
          className="w-full border p-2 rounded"
        >
          <option value="">Select Company Size</option>
          <option value="1-10">1-10 Employees</option>
          <option value="11-50">11-50 Employees</option>
          <option value="51-200">51-200 Employees</option>
          <option value="200+">200+ Employees</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save and Continue'}
        </button>
      </form>
    </div>
  );
}
