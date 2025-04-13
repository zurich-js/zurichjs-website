import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const isHomePage = router.pathname === '/';

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    
    // Check scroll position immediately on mount
    handleScroll();
    
    // Add event listener for future scrolls
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    const handleRouteChange = () => setIsOpen(false);
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router]);

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Events', path: '/events' },
    { name: 'Speakers', path: '/speakers' },
    { name: 'CFP', path: '/cfp' },
    { name: 'Partnerships', path: '/partnerships' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  const coffeeItem = { name: '☕ Buy us a coffee', path: '/buy-us-a-coffee' };

  return (
    <header
      className={`fixed w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-black text-js shadow-md py-2' : 'bg-transparent text-black py-4'
      }`}
    >
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center ${isHomePage && !scrolled ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            >
              <span className="font-bold text-3xl">Zurich<span className="font-black">JS</span></span>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center">
            <ul className="flex space-x-8 items-center mr-4">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className={`hover:text-blue-600 transition-colors ${
                      router.pathname === item.path ? 'font-bold' : ''
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={coffeeItem.path}
                  className={`
                    bg-js-dark text-black px-4 py-2 rounded-full font-medium 
                    hover:bg-js hover:shadow-md transition-all duration-300 
                    transform hover:scale-105 flex items-center gap-1
                    ${scrolled ? 'shadow-sm' : 'border border-black hover:border-transparent'}
                  `}
                >
                  <span>☕</span>
                  <span className="md:hidden xl:inline">Buy us a coffee</span>
                </Link>
              </li>
            </ul>
            
            {/* Auth buttons for desktop */}
            <div className="flex items-center gap-4">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className={`
                    px-4 py-2 rounded-full font-medium 
                    transition-all duration-300 transform hover:scale-105
                    ${scrolled ? 'bg-js-dark text-black hover:bg-js' : 'bg-black text-js hover:bg-gray-800'}
                  `}>
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton 
                  appearance={{
                    elements: {
                      userButtonAvatarBox: 'w-8 h-8'
                    }
                  }}
                  afterSignOutUrl="/"
                />
              </SignedIn>
            </div>
          </nav>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center">
            <SignedIn>
              <UserButton 
                appearance={{
                  elements: {
                    userButtonAvatarBox: 'w-8 h-8 mr-3'
                  }
                }}
                afterSignOutUrl="/"
              />
            </SignedIn>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="focus:outline-none"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="lg:hidden bg-black text-js"
        >
          <nav className="container mx-auto px-6 py-4">
            <ul className="space-y-4">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className={`block py-2 hover:text-blue-600 transition-colors ${
                      router.pathname === item.path ? 'font-bold' : ''
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={coffeeItem.path}
                  className={`
                    bg-js-dark text-black px-4 py-2 rounded-full font-medium 
                    hover:bg-js hover:shadow-md transition-all duration-300 
                    transform hover:scale-105 flex items-center gap-1
                    ${scrolled ? 'shadow-sm' : 'border border-black hover:border-transparent'}
                  `}
                >
                  <span>☕</span>
                  <span>Buy us a coffee</span>
                </Link>
              </li>
              
              {/* Auth button for mobile */}
              <SignedOut>
                <li className="mt-2">
                  <SignInButton mode="modal">
                    <button className="bg-js-dark text-black px-4 py-2 rounded-full font-medium w-full">
                      Sign In
                    </button>
                  </SignInButton>
                </li>
              </SignedOut>
            </ul>
          </nav>
        </motion.div>
      )}
    </header>
  );
}
