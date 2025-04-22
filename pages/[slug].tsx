import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import admin from "firebase-admin";

export default function PublicQuote() {
  const { slug } = useRouter().query as { slug: string };
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    if (!slug) return;
    // Find contractor by slug
    admin.firestore()
      .collection("contractors")
      .where("linkSlug","==",slug)
      .limit(1)
      .get()
      .then(qs=>qs.docs[0]?.data() && setSettings(qs.docs[0].data()));
  }, [slug]);

  if (!settings) return <p>Loading…</p>;

  // Render your customer form (name, description, photo upload…)
  return (
    <form>
      <h1>{settings.businessName} – Request a Quote</h1>
      {/* inputs for customer info & problem description */}
      <button>Submit</button>
    </form>
  );
}
