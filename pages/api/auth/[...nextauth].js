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
      if (account.provider === 'google') {
        user.role = 'consumer';
      }
      // Debug log
      console.log('SignIn callback:', { user, account });
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.role = account?.provider === 'credentials' ? 'contractor' : 'consumer';
        token.uid = user.id;
        // Debug log
        console.log('JWT callback:', { token, user, account });
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      session.user.uid = token.uid;
      // Debug log
      console.log('Session callback:', { session, token });
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Debug log
      console.log('Redirect callback:', { url, baseUrl });
      
      if (url.startsWith(baseUrl)) {
        // Keep same-origin URLs as-is
        return url;
      }
      
      // Default redirects based on role
      if (url.includes('/contractor')) {
        return `${baseUrl}/contractor/dashboard`;
      }
      
      // Default to main dashboard
      return `${baseUrl}/dashboard`;
    }
  },
  debug: true // Enable debug messages
});
