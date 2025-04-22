import type { NextApiRequest, NextApiResponse } from "next";
import admin from "firebase-admin";

// init admin if needed (same as in [...nextauth])
if (!admin.apps.length) {
  admin.initializeApp({ /* ... */ });
}
const db = admin.firestore();
const auth = admin.auth();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1) Verify Firebase auth token
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).end("Missing token");
  const { uid } = await auth.verifyIdToken(token);

  const ref = db.collection("contractors").doc(uid);
  if (req.method === "GET") {
    const snap = await ref.get();
    return res.json(snap.data() || {});
  } else if (req.method === "POST") {
    await ref.set(req.body, { merge: true });
    return res.status(204).end();
  } else {
    res.setHeader("Allow", ["GET","POST"]);
    return res.status(405).end();
  }
}
