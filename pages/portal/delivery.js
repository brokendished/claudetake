
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
            {window.location.origin}/
          </span>
          <input
            type="text"
            value={form.linkSlug}
            onChange={e => setForm(f => ({ ...f, linkSlug: e.target.value }))}
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
