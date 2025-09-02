import { SignedIn, SignedOut, SignInButton, UserButton, useSignIn, useAuth } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';

import Logo from "@/components/ui/Logo";

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
  const { orgId } = useAuth();
  const signInButtonRef = useRef<HTMLButtonElement>(null);

  // Check if user is admin (member of ZurichJS admin organization)
  const isAdmin = orgId === process.env.NEXT_PUBLIC_ZURICHJS_ADMIN_ORG_ID;

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
        { name: 'T-shirts', path: '/tshirt' },
        { name: 'Contact', path: '/contact' },
      ]
    },
  ];

  const coffeeItem: NavItem = { name: '☕ Buy us a coffee', path: '/buy-us-a-coffee' };

  // Admin quick actions - most commonly used admin features
  const adminQuickActions: NavSubItem[] = [
    { name: 'Admin Dashboard', path: '/admin' },
    { name: 'User Management', path: '/admin/users' },
    { name: 'Feedback Analytics', path: '/admin/feedback-analytics' },
    { name: 'Coupon Management', path: '/admin/coupons' },
  ];

  const adminItem: NavItem = {
    name: 'Admin Tools',
    id: 'admin-tools',
    items: adminQuickActions
  };

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
    return `w-full fixed top-0 left-0 right-0 z-[60] transition-all duration-300 ${
      scrolled ? 'bg-black text-js shadow-md py-2' : 'bg-transparent text-black py-2 lg:py-4'
    }`;
  };

  const getLinkActiveClasses = (path: string) => {
    return `hover:text-blue-600 transition-colors flex items-center font-medium ${router.pathname === path ? 'font-bold text-blue-600' : ''
      }`;
  };

  const getSubItemClasses = (path: string) => {
    return `block hover:text-blue-600 transition-colors whitespace-nowrap py-1 ${router.pathname === path ? 'font-bold text-blue-300' : ''
      }`;
  };

  const getProfileLinkClasses = () => {
    return `mr-1 font-medium hover:text-blue-600 transition-colors ${router.pathname.startsWith('/profile') ? 'font-bold text-blue-600' : ''}`;
  };

  const getMobileLinkClasses = (path: string) => {
    return `block py-3 text-white hover:text-js transition-colors font-medium ${
      router.pathname === path ? 'font-bold text-js' : ''
    }`;
  };

  const getMobileSubItemClasses = (path: string) => {
    return `block py-2.5 pl-4 text-white/80 hover:text-js transition-colors ${
      router.pathname === path ? 'font-bold text-js' : ''
    }`;
  };

  const getMobileAdminLinkClasses = () => {
    return `flex items-center justify-between w-full py-3 text-red-400 hover:text-red-300 transition-colors font-medium`;
  };

  const getMobileAdminSubItemClasses = (path: string) => {
    return `block py-2.5 pl-4 text-red-300/80 hover:text-red-200 transition-colors ${
      router.pathname === path ? 'font-bold text-red-200' : ''
    }`;
  };

  const getSignInButtonClasses = () => {
    const baseClasses = "px-4 py-2 rounded-full font-medium transition-all duration-300";
    return scrolled
      ? `${baseClasses} bg-js-dark text-black hover:bg-js`
      : `${baseClasses} bg-black text-js hover:bg-gray-800`;
  };

  const getCoffeeButtonClasses = () => {
    const baseClasses = "bg-js-dark text-black px-3 py-1.5 rounded-full hover:bg-js hover:shadow-md transition-all duration-300 flex items-center gap-1.5 font-medium";
    return `${baseClasses} ${scrolled ? 'shadow-sm' : 'border border-black hover:border-transparent'}`;
  };

  // Add a specific function for the mobile coffee button
  const getMobileCoffeeButtonClasses = () => {
    return `
      bg-js text-black px-4 py-3 rounded-full font-medium w-full
      inline-flex items-center justify-center gap-2 hover:bg-js-dark transition-colors
    `;
  };

  // Admin-specific styling
  const getAdminDropdownClasses = () => {
    return "absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-red-900 text-white py-3 px-4 rounded-lg shadow-lg min-w-[200px] z-[60] border border-red-700";
  };



  const getAdminSubItemClasses = (path: string) => {
    return `block hover:text-red-200 transition-colors whitespace-nowrap py-1 ${
      router.pathname === path ? 'font-bold text-red-200' : ''
    }`;
  };

  return (
    <header className={getHeaderClasses()}>
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex justify-between items-center">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center opacity-100 transition-opacity duration-300"
              >
                <Logo textClasses={scrolled ? 'fill-white' : 'fill-black'} className="h-5 w-auto transition-colors duration-300 ease-in-out" />
              </motion.div>
            </Link>

            {/* Coffee button for larger screens */}
            <div className="ml-4 hidden xl:block">
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
            <ul className="flex items-center space-x-1 xl:space-x-4 mr-4 xl:mr-6">
              {[...navItems, ...(isAdmin ? [adminItem] : [])].map((item) => (
                <li
                  key={item.name}
                  className={`relative group ${item.items ? 'cursor-pointer' : ''}`}
                  onMouseEnter={() => item.id && handleDropdownHover(item.id)}
                  onMouseLeave={() => handleDropdownHover(null)}
                >
                  {item.path ? (
                    <Link
                      href={item.path}
                      className={`${getLinkActiveClasses(item.path)} px-3 py-2 rounded-md text-sm xl:text-base`}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <div className={`flex items-center transition-colors px-3 py-2 rounded-md font-medium text-sm xl:text-base ${
                      item.id === 'admin-tools' ? 'hover:text-red-400 text-red-500' : 'hover:text-blue-600'
                    }`}>
                      {item.id === 'admin-tools' && <Settings size={16} className="mr-1" />}
                      {item.name} <ChevronDown size={16} className="ml-1" />
                    </div>
                  )}

                  {/* Dropdown menu */}
                  {item.items && item.id && activeDropdown === item.id && (
                    <div className={item.id === 'admin-tools' ? getAdminDropdownClasses() : "absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-black text-js py-3 px-4 rounded-lg shadow-lg min-w-[180px] z-[60]"}>
                      {/* Add invisible extension to prevent mouse gap */}
                      <div className="absolute h-2 w-full top-[-8px] left-0"></div>
                      <ul className="space-y-1">
                        {item.items.map((subItem) => (
                          <li key={subItem.path}>
                            <Link
                              href={subItem.path}
                              className={item.id === 'admin-tools' ? getAdminSubItemClasses(subItem.path) : getSubItemClasses(subItem.path)}
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

              {/* Coffee button for medium screens */}
              <li className="xl:hidden">
                <Link
                  href={coffeeItem.path || '#'}
                  className={`${getCoffeeButtonClasses()} text-sm`}
                >
                  <span>☕</span>
                </Link>
              </li>
            </ul>

            {/* Auth and account section */}
            <div className="flex items-center gap-3">
              <SignedIn>
                <Link
                  href="/profile"
                  className={`${getProfileLinkClasses()} px-3 py-2 rounded-md text-sm xl:text-base`}
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
              className={`transition-colors p-2 rounded-md ${scrolled ? 'text-js hover:text-js-dark' : 'text-black hover:text-gray-800'}`}
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden bg-black text-white border-t border-js/20 mt-1"
          >
            <div className="container mx-auto px-4">
              {/* Auth section */}
              <div className="py-4 border-b border-js/20">
                <SignedIn>
                  <div className="flex items-center justify-between">
                    <Link
                      href="/profile"
                      className="text-white hover:text-js transition-colors font-medium"
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
                    <button ref={signInButtonRef} className="w-full bg-js text-black px-4 py-3 rounded-full font-medium hover:bg-js-dark transition-colors">
                      Sign In
                    </button>
                  </SignInButton>
                </SignedOut>
              </div>

              {/* Navigation items */}
              <ul className="py-4 space-y-1">
                {[...navItems, ...(isAdmin ? [adminItem] : [])].map((item) => (
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
                          className={item.id === 'admin-tools' ? getMobileAdminLinkClasses() : "flex items-center justify-between w-full py-3 text-white hover:text-js transition-colors font-medium"}
                        >
                          <span className="flex items-center">
                            {item.id === 'admin-tools' && <Settings size={16} className="mr-2" />}
                            {item.name}
                          </span>
                          <ChevronRight
                            size={18}
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
                              className="overflow-hidden"
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
                                    className={item.id === 'admin-tools' ? getMobileAdminSubItemClasses(subItem.path) : getMobileSubItemClasses(subItem.path)}
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

              {/* Coffee button */}
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
      </AnimatePresence>
    </header>
  );
}
