import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';

export default function DeliverySettings() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated: () => signIn(),
  });

  const [form, setForm] = useState({ quoteEmail: '', webhookUrl: '', linkSlug: '' });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/contractor/profile', {
        headers: { Authorization: `Bearer ${session.firebaseToken}` }
      })
        .then(r => r.json())
        .then(data => {
          setForm({
            quoteEmail: data.quoteDelivery?.email || '',
            webhookUrl: data.quoteDelivery?.webhookUrl || '',
            linkSlug: data.linkSlug || ''
          });
        });
    }
  }, [status, session]);

  async function save() {
    setSaving(true);
    await fetch('/api/contractor/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.firebaseToken}`
      },
      body: JSON.stringify({
        quoteDelivery: { email: form.quoteEmail, webhookUrl: form.webhookUrl },
        linkSlug: form.linkSlug.trim(),
      }),
    });
    setSaving(false);
  }

  function copyUrl() {
    const url = `${window.location.origin}/${form.linkSlug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (status !== 'authenticated') return null;

  return (
    <div className="p-4 max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Quote Delivery & Link</h1>

      <label className="block">
        <span>Send quotes to (email)</span>
        <input
          type="email"
          value={form.quoteEmail}
          onChange={e => setForm(f => ({ ...f, quoteEmail: e.target.value }))}
          className="mt-1 block w-full border rounded p-2"
        />
      </label>

      <label className="block">
        <span>Webhook URL (optional)</span>
        <input
          type="url"
          value={form.webhookUrl}
          onChange={e => setForm(f => ({ ...f, webhookUrl: e.target.value }))}
          className="mt-1 block w-full border rounded p-2"
        />
      </label>

      <label className="block">
        <span>Your shareable link slug</span>
        <div className="flex">
          <span className="bg-gray-100 px-2 py-1 rounded-l">
            {typeof window !== 'undefined' ? window.location.origin : ''}/
          </span>
          <input
            type="text"
            value={form.linkSlug}
            onChange={e => setForm(f => ({ ...f, linkSlug: e.target.value }))}
            className="flex-1 border rounded-r p-2"
          />
        </div>
        <p className="text-sm text-gray-500">lowercase letters, numbers & dashes only</p>
      </label>

      {form.linkSlug && (
        <div className="flex items-center space-x-3">
          <a
            href={`/${form.linkSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-600"
          >
            Preview link
          </a>
          <button onClick={copyUrl} className="px-3 py-1 bg-gray-200 rounded">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  );
}
