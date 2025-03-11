import { useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import { initGA, logPageView } from '@/lib/analytics';

export default function Layout({ children }) {
  useEffect(() => {
    // Initialize Google Analytics
    if (!window.GA_INITIALIZED) {
      initGA();
      window.GA_INITIALIZED = true;
    }
    logPageView();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}
