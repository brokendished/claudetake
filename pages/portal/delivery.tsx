// pages/portal/delivery.tsx
import { useSession, signIn } from "next-auth/react";
export default function Page() {
  const { data: session } = useSession({ required: true, onUnauthenticated: ()=> signIn() });
  if (!session) return null;
  // now you can use session.firebaseToken

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";

export default function DeliverySettings() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated: () => signIn(),
  });
  const token = session?.firebaseToken;

  // form state
  const [form, setForm] = useState({
    quoteEmail: "",
    webhookUrl: "",
    linkSlug: "",
  });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // load existing settings
  useEffect(() => {
    if (!token) return;
    fetch("/api/contractor/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setForm({
          quoteEmail: data.quoteDelivery?.email || "",
          webhookUrl: data.quoteDelivery?.webhookUrl || "",
          linkSlug: data.linkSlug || "",
        });
      });
  }, [token]);

  // save settings
  async function save() {
    setSaving(true);
    await fetch("/api/contractor/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        quoteDelivery: { email: form.quoteEmail, webhookUrl: form.webhookUrl },
        linkSlug: form.linkSlug.trim(),
      }),
    });
    setSaving(false);
  }

  // copy public URL
  function copyUrl() {
    const url = `${window.location.origin}/${form.linkSlug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // loading guard
  if (status !== "authenticated") return null;

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Quote Delivery & Public Link</h1>

      {/* Quote Email */}
      <label className="block">
        <span className="font-medium">Send quotes to (email)</span>
        <input
          type="email"
          className="mt-1 block w-full border rounded p-2"
          placeholder="you@business.com"
          value={form.quoteEmail}
          onChange={(e) =>
            setForm((f) => ({ ...f, quoteEmail: e.target.value }))
          }
        />
      </label>

      {/* Webhook URL */}
      <label className="block">
        <span className="font-medium">
          Webhook URL (optional)
        </span>
        <input
          type="url"
          className="mt-1 block w-full border rounded p-2"
          placeholder="https://webhook.site/..."
          value={form.webhookUrl}
          onChange={(e) =>
            setForm((f) => ({ ...f, webhookUrl: e.target.value }))
          }
        />
      </label>

      {/* Link Slug */}
      <label className="block">
        <span className="font-medium">Your shareable link slug</span>
        <div className="flex space-x-2 items-center">
          <span className="inline-block p-2 bg-gray-100 rounded-l text-gray-600">
            {window.location.origin}/
          </span>
          <input
            type="text"
            className="flex-1 border rounded-r p-2"
            placeholder="my-business-quotes"
            value={form.linkSlug}
            onChange={(e) =>
              setForm((f) => ({ ...f, linkSlug: e.target.value }))
            }
          />
        </div>
        <p className="text-sm text-gray-500">
          Only lowercase letters, numbers, and dashes.
        </p>
      </label>

      {/* Preview & Copy */}
      {form.linkSlug && (
        <div className="flex items-center space-x-4">
          <a
            href={`/${form.linkSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            Preview: {window.location.origin}/{form.linkSlug}
          </a>
          <button
            onClick={copyUrl}
            className="px-3 py-1 bg-gray-200 rounded"
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-blue-600 text-white p-3 rounded disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Settings"}
      </button>
    </div>
  );
}
}
