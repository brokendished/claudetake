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

// If `getInitialProps` is needed:
App.getInitialProps = async (appContext) => {
  const appProps = await App.getInitialProps(appContext);
  return { ...appProps };
};
