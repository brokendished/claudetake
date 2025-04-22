// pages/[slug].js
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function PublicQuote({ contractor }) {
  const [form, setForm] = useState({ name:'', email:'', description:'' });
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    await fetch(`/api/contractor/${contractor.uid}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSubmitted(true);
  }

  if (submitted) {
    return <p>{contractor.thankYouMessage || 'Thanks! We’ll be in touch.'}</p>;
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold">{contractor.businessName} – Request a Quote</h1>
      <p className="mb-4">{contractor.introMessage}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span>Name</span>
          <input
            type="text"
            className="mt-1 block w-full border rounded p-2"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
        </label>
        <label className="block">
          <span>Email</span>
          <input
            type="email"
            className="mt-1 block w-full border rounded p-2"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
          />
        </label>
        <label className="block">
          <span>Issue Description</span>
          <textarea
            className="mt-1 block w-full border rounded p-2"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={4}
            required
          />
        </label>
        <button className="w-full bg-green-600 text-white py-2 rounded">
          Submit
        </button>
      </form>
    </div>
  );
}

// Server‑side fetch so no public Firestore reads
export async function getServerSideProps({ params }) {
  const { initAdmin } = require('../libs/firebaseAdmin');
  initAdmin();
  const admin = require('firebase-admin');
  const db = admin.firestore();

  const qs = await db
    .collection('contractors')
    .where('linkSlug','==',params.slug)
    .limit(1)
    .get();

  if (qs.empty) {
    return { notFound: true };
  }

  const doc = qs.docs[0];
  return {
    props: {
      contractor: { uid: doc.id, ...doc.data() }
    }
  };
}
