import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Menu, X, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

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
        { name: 'Speakers', path: '/speakers' },
      ]
    },
    {
      name: 'Participate',
      id: 'participate',
      items: [
        { name: 'CFP', path: '/cfp' },
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
    return `fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-black text-js shadow-md py-2' : 'bg-transparent text-black py-4'
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
    return `block py-2 hover:text-blue-600 transition-colors ${router.pathname === path ? 'font-bold' : ''
      }`;
  };

  const getMobileSubItemClasses = (path: string) => {
    return `block py-1.5 hover:text-blue-600 transition-colors ${router.pathname === path ? 'font-bold' : ''
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
      bg-js-dark text-black px-4 py-2 rounded-full font-medium w-full
      inline-flex items-center justify-center gap-2
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
                  <button className={getSignInButtonClasses()}>
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
              className="focus:outline-none ml-6"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation with Accordions */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="lg:hidden bg-black text-js mt-3"
        >
          <nav className="container mx-auto px-6 py-4">
            {/* User account info */}
            <SignedIn>
              <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-3">
                <Link
                  href="/profile"
                  className={`py-2 hover:text-blue-600 transition-colors ${router.pathname.startsWith('/profile') ? 'font-bold' : ''}`}
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

            <ul className="space-y-3">
              {navItems.map((item) => (
                <li key={item.name} className="border-b border-gray-800 pb-2">
                  {item.path ? (
                    <Link
                      href={item.path}
                      className={getMobileLinkClasses(item.path)}
                    >
                      {item.name}
                    </Link>
                  ) : item.id && item.items ? (
                    <>
                      <button
                        onClick={() => item.id && toggleMobileAccordion(item.id)}
                        className="w-full text-left py-2 flex justify-between items-center"
                      >
                        <span>{item.name}</span>
                        {item.id && mobileExpanded.includes(item.id) ?
                          <ChevronDown size={18} /> :
                          <ChevronRight size={18} />
                        }
                      </button>

                      {/* Accordion content */}
                      {item.id && mobileExpanded.includes(item.id) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="pl-4 mt-1 space-y-2"
                        >
                          {item.items.map((subItem) => (
                            <Link
                              key={subItem.path}
                              href={subItem.path}
                              className={getMobileSubItemClasses(subItem.path)}
                            >
                              {subItem.name}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </>
                  ) : null}
                </li>
              ))}

              <li className="mt-4 border-b border-gray-800 pb-2">
                <Link
                  href={coffeeItem.path || '#'}
                  className={getMobileCoffeeButtonClasses()}
                >
                  <span>☕</span>
                  <span className="font-semibold">Buy us a coffee</span>
                </Link>
              </li>
            </ul>

            {/* Auth button for mobile */}
            <SignedOut>
              <div className="mt-4 pb-2">
                <SignInButton mode="modal">
                  <button className="bg-js-dark text-black px-4 py-2 rounded-full font-medium w-full">
                    Sign In
                  </button>
                </SignInButton>
              </div>
            </SignedOut>
          </nav>
        </motion.div>
      )}
    </header>
  );
}
