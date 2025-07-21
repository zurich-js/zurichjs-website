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
      setScrolled(window.scrollY > 20);
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
    { name: 'Events', path: '/events' },
    { name: 'Workshops', path: '/workshops' },
    { name: 'Speakers', path: '/speakers' },
    { name: 'Media', path: '/media' },
    {
      name: 'Get Involved',
      id: 'get-involved',
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
    return `w-full fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out backdrop-blur-sm ${
      scrolled 
        ? 'bg-black/95 text-js shadow-xl border-b border-js/20 py-3' 
        : 'bg-transparent text-black py-4 lg:py-6'
    }`;
  };

  const getLinkActiveClasses = (path: string) => {
    const isActive = router.pathname === path;
    return `
      hover:text-zurich transition-all duration-250 ease-out
      flex items-center font-medium cursor-pointer
      relative group px-4 py-2 rounded-lg
      hover:bg-zurich/15 hover:scale-105
      ${isActive ? 'text-zurich bg-zurich/15 scale-105' : ''}
      ${scrolled ? 'hover:bg-js/20' : 'hover:bg-black/8 hover:backdrop-blur-md'}
    `;
  };

  const getSubItemClasses = (path: string) => {
    const isActive = router.pathname === path;
    return `
      block hover:text-js transition-all duration-200 ease-out
      whitespace-nowrap py-3 px-4 rounded-md cursor-pointer
      hover:bg-js/15 hover:translate-x-2
      ${isActive ? 'text-js bg-js/15 translate-x-1' : 'text-white/90'}
    `;
  };

  const getProfileLinkClasses = () => {
    const isActive = router.pathname.startsWith('/profile');
    return `
      font-medium hover:text-zurich transition-all duration-250 ease-out
      cursor-pointer px-4 py-2 rounded-lg hover:bg-zurich/15 hover:scale-105
      ${isActive ? 'text-zurich bg-zurich/15 scale-105' : ''}
      ${scrolled ? 'hover:bg-js/20' : 'hover:bg-black/8 hover:backdrop-blur-md'}
    `;
  };

  const getMobileLinkClasses = (path: string) => {
    const isActive = router.pathname === path;
    return `
      block py-4 text-white hover:text-js
      transition-all duration-200 ease-out font-medium cursor-pointer
      px-2 rounded-lg hover:bg-js/15 hover:translate-x-2
      ${isActive ? 'text-js bg-js/15 translate-x-1' : ''}
    `;
  };

  const getMobileSubItemClasses = (path: string) => {
    const isActive = router.pathname === path;
    return `
      block py-3 pl-6 text-white/80 hover:text-js
      transition-all duration-200 ease-out cursor-pointer rounded-lg
      hover:bg-js/15 hover:translate-x-2
      ${isActive ? 'text-js bg-js/15 translate-x-1' : ''}
    `;
  };

  const getSignInButtonClasses = () => {
    const baseClasses = `
      px-6 py-2.5 rounded-full font-medium transition-all duration-250 ease-out
      cursor-pointer hover:scale-105 hover:shadow-lg
      active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2
    `;
    return scrolled
      ? `${baseClasses} bg-js text-black hover:bg-js-dark focus:ring-js`
      : `${baseClasses} bg-black/90 backdrop-blur-md text-js hover:bg-black hover:shadow-xl focus:ring-black`;
  };

  const getCoffeeButtonClasses = () => {
    const baseClasses = `
      text-black px-4 py-2.5 rounded-full font-medium cursor-pointer
      hover:scale-105 transition-all duration-250 ease-out
      flex items-center gap-2 active:scale-95 focus:outline-none 
      focus:ring-2 focus:ring-offset-2
    `;
    return scrolled 
      ? `${baseClasses} bg-gradient-to-r from-js-dark to-js hover:from-js hover:to-js-dark hover:shadow-xl border-2 border-transparent hover:border-js/30 focus:ring-js shadow-lg`
      : `${baseClasses} bg-black text-js hover:bg-gray-900 hover:text-js-dark shadow-lg hover:shadow-xl border-2 border-black/20 hover:border-black focus:ring-black`;
  };

  const getMobileCoffeeButtonClasses = () => {
    return `
      bg-gradient-to-r from-js to-js-dark text-black px-6 py-4 rounded-full
      font-medium w-full inline-flex items-center justify-center gap-2.5
      hover:from-js-dark hover:to-js hover:shadow-xl
      transition-all duration-250 ease-out cursor-pointer active:scale-95
      focus:outline-none focus:ring-2 focus:ring-js focus:ring-offset-2
      border-2 border-js/20 hover:border-js/40
    `;
  };

  const getDropdownMenuClasses = () => {
    return `
      absolute top-full left-1/2 transform -translate-x-1/2 mt-2
      bg-black/95 backdrop-blur-md text-js py-4 px-2 rounded-xl
      shadow-2xl border border-js/20 min-w-[200px] z-10
      before:content-[''] before:absolute before:top-[-6px] before:left-1/2
      before:transform before:-translate-x-1/2 before:border-6 before:border-transparent
      before:border-b-black/95
    `;
  };

  const getDropdownTriggerClasses = () => {
    return `
      flex items-center hover:text-zurich transition-all duration-250 ease-out
      cursor-pointer px-4 py-2 rounded-lg hover:bg-zurich/15 hover:scale-105
      ${scrolled ? 'hover:bg-js/20' : 'hover:bg-black/8 hover:backdrop-blur-md'}
    `;
  };

  const getMobileMenuClasses = () => {
    return `
      lg:hidden bg-gradient-to-b from-black via-black/98 to-black/95
      backdrop-blur-md text-white border-t border-js/30 shadow-2xl
    `;
  };

  return (
    <header className={getHeaderClasses()}>
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex justify-between items-center">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center cursor-pointer">
                              <motion.div
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center opacity-100 transition-all duration-200 ease-out hover:text-zurich"
                >
                <span className="font-bold text-2xl lg:text-3xl tracking-tight">
                  Zurich<span className="font-black text-zurich">JS</span>
                </span>
              </motion.div>
            </Link>

            {/* Coffee button for larger screens */}
            <div className="ml-6 hidden xl:block">
              <Link
                href={coffeeItem.path || '#'}
                className={getCoffeeButtonClasses()}
                title="Support ZurichJS - Buy us a coffee"
              >
                <motion.span
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  ☕
                </motion.span>
                <span className="text-sm whitespace-nowrap">Buy us a coffee</span>
              </Link>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center">
            <ul className="flex items-center space-x-1 xl:space-x-2 mr-6">
              {navItems.map((item) => (
                <li
                  key={item.name}
                  className="relative group"
                  onMouseEnter={() => item.id && handleDropdownHover(item.id)}
                  onMouseLeave={() => handleDropdownHover(null)}
                >
                  {item.path ? (
                    <Link
                      href={item.path}
                      className={`${getLinkActiveClasses(item.path)} text-sm xl:text-base`}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <div className={`${getDropdownTriggerClasses()} text-sm xl:text-base`}>
                      {item.name} 
                      <ChevronDown 
                        size={16} 
                        className={`ml-1 transition-transform duration-200 ease-out ${
                          activeDropdown === item.id ? 'rotate-180' : ''
                        }`} 
                      />
                    </div>
                  )}

                  {/* Dropdown menu */}
                  {item.items && item.id && activeDropdown === item.id && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className={getDropdownMenuClasses()}
                    >
                      {/* Add invisible extension to prevent mouse gap */}
                      <div className="absolute h-4 w-full top-[-16px] left-0"></div>
                      <ul className="space-y-1">
                        {item.items.map((subItem) => (
                          <motion.li 
                            key={subItem.path}
                            whileHover={{ x: 4 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Link
                              href={subItem.path}
                              className={getSubItemClasses(subItem.path)}
                            >
                              {subItem.name}
                            </Link>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </li>
              ))}
              
              {/* Coffee button for medium screens */}
              <li className="xl:hidden">
                <Link
                  href={coffeeItem.path || '#'}
                  className={`${getCoffeeButtonClasses()} text-sm px-3 py-2`}
                  title="Buy us a coffee"
                >
                  <motion.span
                    animate={{ y: [0, -2, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    ☕
                  </motion.span>
                </Link>
              </li>
            </ul>

            {/* Auth and account section */}
            <div className="flex items-center gap-3">
              <SignedIn>
                <Link
                  href="/profile"
                  className={`${getProfileLinkClasses()} text-sm xl:text-base`}
                >
                  Profile
                </Link>
                <div className="hover:scale-110 transition-transform duration-200 ease-out">
                  <UserButton
                    appearance={{
                      elements: {
                        userButtonAvatarBox: 'w-9 h-9 cursor-pointer hover:shadow-lg transition-shadow duration-200'
                      }
                    }}
                    afterSignOutUrl="/"
                  />
                </div>
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
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(!isOpen)}
              className={`
                transition-all duration-200 ease-out p-2.5 rounded-lg cursor-pointer
                hover:bg-zurich/20 hover:scale-110 active:scale-95 backdrop-blur-sm
                ${scrolled ? 'text-js hover:text-js-dark' : 'text-black hover:text-zurich hover:bg-black/8'}
              `}
              aria-label="Toggle menu"
            >
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </motion.div>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={getMobileMenuClasses()}
          >
            <div className="container mx-auto px-4">
              {/* Auth section */}
              <div className="py-5 border-b border-js/30">
                <SignedIn>
                  <div className="flex items-center justify-between">
                    <Link
                      href="/profile"
                      className="text-white hover:text-js transition-all duration-200 ease-out font-medium cursor-pointer hover:translate-x-2"
                    >
                      Profile
                    </Link>
                    <div className="hover:scale-110 transition-transform duration-200 ease-out">
                      <UserButton
                        appearance={{
                          elements: {
                            userButtonAvatarBox: 'w-9 h-9 cursor-pointer hover:shadow-lg transition-shadow duration-200'
                          }
                        }}
                        afterSignOutUrl="/"
                      />
                    </div>
                  </div>
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button ref={signInButtonRef} className={getMobileCoffeeButtonClasses()}>
                      Sign In
                    </button>
                  </SignInButton>
                </SignedOut>
              </div>

              {/* Navigation items */}
              <ul className="py-4 space-y-1">
                {navItems.map((item) => (
                                      <motion.li
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15, delay: 0.05 }}
                    >
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
                          className="flex items-center justify-between w-full py-4 px-2 text-white hover:text-js transition-all duration-200 ease-out font-medium cursor-pointer rounded-lg hover:bg-js/15"
                        >
                          <span>{item.name}</span>
                          <ChevronRight
                            size={18}
                            className={`transform transition-transform duration-200 ease-out ${
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
                              className="overflow-hidden"
                            >
                              {item.items.map((subItem, index) => (
                                <motion.li
                                  key={subItem.path}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -10 }}
                                  transition={{ duration: 0.15, delay: index * 0.03 }}
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
                  </motion.li>
                ))}
              </ul>

              {/* Coffee button */}
              <motion.div
                className="py-5 border-t border-js/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: 0.1 }}
              >
                <Link
                  href={coffeeItem.path || '#'}
                  className={getMobileCoffeeButtonClasses()}
                  title="Support ZurichJS - Buy us a coffee"
                >
                  <motion.span
                    animate={{ y: [0, -2, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    ☕
                  </motion.span>
                  <span>Buy us a coffee</span>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
