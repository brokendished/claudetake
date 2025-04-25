// pages/portal/delivery.js

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../libs/firebaseClient';

export default function DeliverySettings() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  const [form, setForm] = useState({ quoteEmail: '', webhookUrl: '', linkSlug: '' });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Load existing settings for this contractor
  useEffect(() => {
    if (user) {
      (async () => {
        try {
          const token = await auth.currentUser.getIdToken();
          const res = await fetch(`/api/contractor/${user.uid}/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error('Failed to fetch profile');
          const data = await res.json();
          setForm({
            quoteEmail: data.quoteDelivery?.email || '',
            webhookUrl: data.quoteDelivery?.webhookUrl || '',
            linkSlug: data.linkSlug || '',
          });
        } catch (err) {
          console.error('Error loading settings:', err);
        }
      })();
    }
  }, [user]);

  // Save settings
  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`/api/contractor/${user.uid}/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quoteDelivery: { email: form.quoteEmail, webhookUrl: form.webhookUrl },
          linkSlug: form.linkSlug.trim(),
        }),
      });
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  // Copy shareable link
  const copyUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    navigator.clipboard.writeText(`${origin}/${form.linkSlug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !user) {
    return <p className="p-4">Loading…</p>;
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Quote Delivery & Link</h1>

      <label className="block">
        <span>Send quotes to (email)</span>
        <input
          type="email"
          value={form.quoteEmail}
          onChange={(e) => setForm(f => ({ ...f, quoteEmail: e.target.value }))}
          className="mt-1 block w-full border rounded p-2"
        />
      </label>

      <label className="block">
        <span>Webhook URL (optional)</span>
        <input
          type="url"
          value={form.webhookUrl}
          onChange={(e) => setForm(f => ({ ...f, webhookUrl: e.target.value }))}
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
            onChange={(e) => setForm(f => ({ ...f, linkSlug: e.target.value }))}
            className="flex-1 border rounded-r p-2"
          />
        </div>
        <p className="text-sm text-gray-500">
          lowercase letters, numbers & dashes only
        </p>
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
