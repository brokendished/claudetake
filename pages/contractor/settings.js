import { useState } from 'react';
import { useRouter } from 'next/router';
import { defaultPrompts } from '../../config/defaultPrompts';

export default function ContractorSettings() {
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [logo, setLogo] = useState(null);
  const [greeting, setGreeting] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState(defaultPrompts);
  const router = useRouter();

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('businessName', businessName);
      formData.append('greeting', greeting);
      if (logo) {
        formData.append('logo', logo);
      }
      formData.append('prompts', JSON.stringify(prompts));

      const res = await fetch('/api/contractor/settings', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      // Redirect to contractor dashboard after successful save
      router.push('/contractor/dashboard');
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
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
        <div className="mb-4">
          <label htmlFor="logo" className="block text-sm font-medium text-gray-700">
            Logo
          </label>
          <input
            type="file"
            id="logo"
            accept="image/*"
            onChange={(e) => setLogo(e.target.files[0])}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="greeting" className="block text-sm font-medium text-gray-700">
            Default Greeting
          </label>
          <textarea
            id="greeting"
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            rows="3"
            placeholder="Enter your default greeting message"
          />
        </div>
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Chatbot Messages</h3>
          {Object.entries(prompts).map(([key, value]) => (
            <div key={key} className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {key.charAt(0).toUpperCase() + key.slice(1)} Message
              </label>
              {Array.isArray(value) ? (
                <div className="space-y-2">
                  {value.map((item, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const newValue = [...value];
                        newValue[idx] = e.target.value;
                        setPrompts(p => ({ ...p, [key]: newValue }));
                      }}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                    />
                  ))}
                </div>
              ) : (
                <textarea
                  value={value}
                  onChange={(e) => setPrompts(p => ({ ...p, [key]: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                  rows={2}
                />
              )}
            </div>
          ))}
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          className={`w-full py-2 px-4 rounded text-white ${
            loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
          }`}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
      <button
        onClick={() => router.push('/contractor/dashboard')}
        className="mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
      >
        View Saved Quotes
      </button>
    </div>
  );
}
