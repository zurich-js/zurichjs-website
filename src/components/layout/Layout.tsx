import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

import AnnouncementBanner from '../AnnouncementBanner';
import Button from '../ui/Button';

import Footer from './Footer';
import Header from './Header';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [showSupportButton, setShowSupportButton] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      // Show button after scrolling 200px
      const scrollPosition = window.scrollY;
      setShowSupportButton(scrollPosition > 40);
    };
    
    window.addEventListener('scroll', handleScroll);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-js to-js-dark">
      <div className="sticky top-0 z-50">
        <AnnouncementBanner />
        <div className="relative bg-transparent">
          <Header />
        </div>
      </div>
      <main className="flex-grow pt-16 lg:pt-20">{children}

        <div className="fixed bottom-6 right-6 z-50">
          {showSupportButton && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Button
                href="/support"
                variant="primary"
                className="flex items-center gap-2 shadow-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                <span>Support ZurichJS</span>
                <span className="ml-2 text-lg">☕</span>
              </Button>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
