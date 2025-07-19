import { SignedIn, SignedOut, SignInButton, UserButton, useSignIn } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';

// Define our interfaces
interface NavSubItem {
  name: string;
  path: string;
}

interface NavItem {
  name: string;
  path?: string;
  id?: string;
  items?: NavSubItem[];
}

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string[]>([]);
  const router = useRouter();
  const { signIn } = useSignIn();
  const signInButtonRef = useRef<HTMLButtonElement>(null);

  // Handle query parameter to open signup modal
  useEffect(() => {
    const { signup } = router.query;
    if (signup === 'true' && signIn && signInButtonRef.current) {
      // Simulate a click on the sign-in button to open the modal
      signInButtonRef.current.click();
    }
  }, [router.query, signIn]);

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
    const handleRouteChange = () => {
      setIsOpen(false);
      setActiveDropdown(null);
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router]);

  const navItems: NavItem[] = [
    { name: 'Home', path: '/' },
    {
      name: 'Events & Speakers',
      id: 'events-speakers',
      items: [
        { name: 'Events', path: '/events' },
        { name: 'Workshops', path: '/workshops' },
        { name: 'Speakers', path: '/speakers' },
        { name: 'Photos & Videos', path: '/media' },
      ]
    },
    {
      name: 'Participate',
      id: 'participate',
      items: [
        { name: 'Call for Speakers', path: '/cfp' },
        { name: 'Call for Volunteers', path: '/cfv' },
        { name: 'Partnerships', path: '/partnerships' },
      ]
    },
    {
      name: 'Community',
      id: 'community',
      items: [
        { name: 'About', path: '/about' },
        { name: 'Contact', path: '/contact' },
      ]
    },
  ];

  const coffeeItem: NavItem = { name: '☕ Buy us a coffee', path: '/buy-us-a-coffee' };

  const toggleMobileAccordion = (id: string) => {
    setMobileExpanded(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleDropdownHover = (id: string | null) => {
    setActiveDropdown(id);
  };

  // Helper functions to generate class names
  const getHeaderClasses = () => {
    return `w-full fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-black text-js shadow-md py-2' : 'bg-transparent text-black py-2 lg:py-4'
    }`;
  };

  const getLinkActiveClasses = (path: string) => {
    return `hover:text-blue-600 transition-colors flex items-center ${router.pathname === path ? 'font-bold' : ''
      }`;
  };

  const getSubItemClasses = (path: string) => {
    return `block hover:text-blue-600 transition-colors whitespace-nowrap ${router.pathname === path ? 'font-bold' : ''
      }`;
  };

  const getProfileLinkClasses = () => {
    return `mr-1 ${router.pathname.startsWith('/profile') ? 'font-bold' : ''}`;
  };

  const getMobileLinkClasses = (path: string) => {
    return `block py-2.5 text-white hover:text-js transition-colors ${
      router.pathname === path ? 'font-bold text-js' : ''
    }`;
  };

  const getMobileSubItemClasses = (path: string) => {
    return `block py-2 text-white/80 hover:text-js transition-colors ${
      router.pathname === path ? 'font-bold text-js' : ''
    }`;
  };

  const getSignInButtonClasses = () => {
    const baseClasses = "px-3 py-1.5 rounded-full font-medium mr-2 transition-all duration-300";
    return scrolled
      ? `${baseClasses} bg-js-dark text-black hover:bg-js`
      : `${baseClasses} bg-black text-js hover:bg-gray-800`;
  };

  const getCoffeeButtonClasses = () => {
    const baseClasses = "bg-js-dark text-black px-3 py-1.5 rounded-full hover:bg-js hover:shadow-md transition-all duration-300 flex items-center gap-1.5";
    return `${baseClasses} ${scrolled ? 'shadow-sm' : 'border border-black hover:border-transparent'}`;
  };

  // Add a specific function for the mobile coffee button
  const getMobileCoffeeButtonClasses = () => {
    return `
      bg-js text-black px-4 py-2.5 rounded-full font-medium w-full
      inline-flex items-center justify-center gap-2 hover:bg-js-dark
    `;
  };

  return (
    <header className={getHeaderClasses()}>
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center opacity-100 transition-opacity duration-300"
              >
                <span className="font-bold text-3xl">Zurich<span className="font-black">JS</span></span>
              </motion.div>
            </Link>

            <div className="ml-4 hidden lg:block">
              <Link
                href={coffeeItem.path || '#'}
                className={getCoffeeButtonClasses()}
              >
                <span>☕</span>
                <span className="text-sm whitespace-nowrap">Buy us a coffee</span>
              </Link>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center">
            <ul className="flex space-x-6 items-center mr-6">
              {navItems.map((item) => (
                <li
                  key={item.name}
                  className={`relative group ${item.items ? 'cursor-pointer' : ''}`}
                  onMouseEnter={() => item.id && handleDropdownHover(item.id)}
                  onMouseLeave={() => handleDropdownHover(null)}
                >
                  {item.path ? (
                    <Link
                      href={item.path}
                      className={getLinkActiveClasses(item.path)}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <div className="flex items-center hover:text-blue-600 transition-colors py-2">
                      {item.name} <ChevronDown size={16} className="ml-1" />
                    </div>
                  )}

                  {/* Dropdown menu */}
                  {item.items && item.id && activeDropdown === item.id && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-black text-js py-2 px-3 rounded-md shadow-lg min-w-[150px] z-10">
                      {/* Add invisible extension to prevent mouse gap */}
                      <div className="absolute h-2 w-full top-[-8px] left-0"></div>
                      <ul className="space-y-2">
                        {item.items.map((subItem) => (
                          <li key={subItem.path}>
                            <Link
                              href={subItem.path}
                              className={getSubItemClasses(subItem.path)}
                            >
                              {subItem.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {/* Auth and account section */}
            <div className="flex items-center gap-3">
              <SignedIn>
                <Link
                  href="/profile"
                  className={getProfileLinkClasses()}
                >
                  Profile
                </Link>
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox: 'w-8 h-8'
                    }
                  }}
                  afterSignOutUrl="/"
                />
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button ref={signInButtonRef} className={getSignInButtonClasses()}>
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
            </div>
          </nav>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`transition-colors ${scrolled ? 'text-js hover:text-js-dark' : 'text-black hover:text-gray-800'}`}
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="lg:hidden bg-black text-white border-t border-js/20 mt-1"
        >
          <div className="container mx-auto px-6">
            <div className="py-4 border-b border-js/20">
              <SignedIn>
                <div className="flex items-center justify-between">
                  <Link
                    href="/profile"
                    className="text-white hover:text-js transition-colors"
                  >
                    Profile
                  </Link>
                  <UserButton
                    appearance={{
                      elements: {
                        userButtonAvatarBox: 'w-8 h-8'
                      }
                    }}
                    afterSignOutUrl="/"
                  />
                </div>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button ref={signInButtonRef} className="w-full bg-js text-black px-4 py-2 rounded-full font-medium hover:bg-js-dark transition-colors">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
            </div>
            <ul className="py-4 space-y-1">
              {navItems.map((item) => (
                <li key={item.name}>
                  {item.path ? (
                    <Link
                      href={item.path}
                      className={getMobileLinkClasses(item.path || '')}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <div>
                      <button
                        onClick={() => toggleMobileAccordion(item.id || '')}
                        className="flex items-center justify-between w-full py-2.5 text-white hover:text-js transition-colors"
                      >
                        <span>{item.name}</span>
                        <ChevronRight
                          size={16}
                          className={`transform transition-transform duration-200 ${
                            mobileExpanded.includes(item.id || '') ? 'rotate-90' : ''
                          }`}
                        />
                      </button>
                      <AnimatePresence>
                        {item.items && mobileExpanded.includes(item.id || '') && (
                          <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="pl-4 overflow-hidden"
                          >
                            {item.items.map((subItem) => (
                              <motion.li
                                key={subItem.path}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                              >
                                <Link
                                  href={subItem.path}
                                  className={getMobileSubItemClasses(subItem.path)}
                                >
                                  {subItem.name}
                                </Link>
                              </motion.li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <div className="py-4 border-t border-js/20">
              <Link
                href={coffeeItem.path || '#'}
                className={getMobileCoffeeButtonClasses()}
              >
                <span>☕</span>
                <span>Buy us a coffee</span>
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </header>
  );
}
