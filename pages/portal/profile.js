// pages/portal/profile.js
import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { syncNextAuthWithFirebase } from '../../libs/firebaseAuth';

export default function Profile() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated: () => signIn(),
  });
  const [form, setForm] = useState({
    name: '', businessName: '', address: '', phone: '', website: '', logoUrl: ''
  });
  const [saving, setSaving] = useState(false);

  // 1) Sign into Firebase and 2) load your profile doc
  useEffect(() => {
    if (status === 'authenticated') {
      syncNextAuthWithFirebase(session).then(() => {
        return fetch('/api/contractor/profile', {
          headers: { Authorization: `Bearer ${session.firebaseToken}` }
        });
      })
      .then(res => res.json())
      .then(data => {
        setForm({
          name: data.name || '',
          businessName: data.businessName || '',
          address: data.address || '',
          phone: data.phone || '',
          website: data.website || '',
          logoUrl: data.logoUrl || ''
        });
      });
    }
  }, [status]);

  // Save updates
  function save() {
    setSaving(true);
    fetch('/api/contractor/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.firebaseToken}`
      },
      body: JSON.stringify(form),
    }).finally(() => setSaving(false));
  }

  if (status !== 'authenticated') return null;
  return (
    <div className="p-4 max-w-md">
      <h1 className="text-xl font-bold mb-4">Your Business Info</h1>
      {['name','businessName','address','phone','website','logoUrl'].map(field => (
        <label key={field} className="block mb-3">
          <span className="font-medium">{field.replace(/([A-Z])/g,' $1')}</span>
          <input
            type="text"
            className="mt-1 block w-full border rounded p-2"
            value={form[field]}
            onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          />
        </label>
      ))}
      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}
