import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyPassword } from '../../../libs/firebaseAuth';

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account"
        }
      }
    }),
    CredentialsProvider({
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Email and password required');
          }
          
          const user = await verifyPassword(credentials.email, credentials.password);
          if (user) {
            return {
              id: user.uid,
              email: user.email,
              name: user.displayName,
              role: 'contractor'
            };
          }
          return null;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/auth/error'
  },
  callbacks: {
    async signIn({ user, account }) {
      return true; // Allow all sign-ins
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.role || 'consumer'; // Default to consumer if no role specified
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role;
        session.user.uid = token.uid;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle contractor redirects
      if (url.startsWith('/contractor')) {
        return url;
      }
      // Redirect to dashboard by default
      return `${baseUrl}/dashboard`;
    }
  }
});
