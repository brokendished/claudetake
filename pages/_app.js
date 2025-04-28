import '@/styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import FirebaseAuthSync from '../components/FirebaseAuthSync';

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <FirebaseAuthSync />
      <Component {...pageProps} />
    </SessionProvider>
  );
}

// Correct implementation of `getInitialProps`
App.getInitialProps = async (appContext) => {
  const appProps = await appContext.Component.getInitialProps?.(appContext.ctx) || {};
  return { pageProps: appProps };
};
