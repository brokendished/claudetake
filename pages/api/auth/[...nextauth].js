import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyPassword } from '../../../libs/firebaseAuth';

export default NextAuth({
  providers: [
    // keep your existing Google (or other) providers
    GoogleProvider({
      clientId:     process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),

    // add this CredentialsProvider for email/password
    CredentialsProvider({
      name: 'Email & Password',
      credentials: {
        email:    { label: 'Email',    type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // call Firebase REST to verify email/password
        const user = await verifyPassword(
          credentials.email,
          credentials.password
        );
        if (user) {
          // NextAuth expects at minimum an { id } and optionally { name, email }
          return { id: user.uid, name: user.displayName, email: user.email };
        }
        return null;
      }
    })
  ],

  session: {
    strategy: 'jwt',
  },

  callbacks: {
    // store the Firebase UID on the token
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    // expose the UID on the `session` object
    async session({ session, token }) {
      session.user.uid = token.uid;
      return session;
    }
  }
});
