// pages/api/auth/[...nextauth].js

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { FirestoreAdapter } from "@auth/firebase-adapter";
import admin from "firebase-admin";

// 1) Initialize Firebase Admin if it isn’t already
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Make sure your private key in env has literal \n characters
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

export default NextAuth({
  // 2) Your existing Google provider
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  // 3) Persist users & sessions in Firestore
  adapter: FirestoreAdapter(admin.firestore()),

  // 4) Keep your secret
  secret: process.env.NEXTAUTH_SECRET,

  // 5) Attach a Firebase custom token to the NextAuth session
  callbacks: {
    async session({ session, token }) {
      // token.sub is the NextAuth user ID
      session.firebaseToken = await admin.auth().createCustomToken(token.sub);
      return session;
    },
  },
});
