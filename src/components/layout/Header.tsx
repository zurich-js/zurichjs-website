import { SignedIn, SignedOut, SignInButton, UserButton, useSignIn, useAuth } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, Settings, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';

import Logo from "@/components/ui/Logo";

// Design tokens matching hero
const COLORS = {
  primaryBlue: '#1D4ED8',
  heroYellow: '#F0DC62',
};

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
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const router = useRouter();
  const { signIn } = useSignIn();
  const { orgId } = useAuth();
  const signInButtonRef = useRef<HTMLButtonElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const adminDropdownRef = useRef<HTMLDivElement>(null);

  // Check if user is admin
  const isAdmin = orgId === process.env.NEXT_PUBLIC_ZURICHJS_ADMIN_ORG_ID;

  // Handle query parameter to open signup modal
  useEffect(() => {
    const { signup } = router.query;
    if (signup === 'true' && signIn && signInButtonRef.current) {
      signInButtonRef.current.click();
    }
  }, [router.query, signIn]);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    const handleRouteChange = () => {
      setIsOpen(false);
      setMoreDropdownOpen(false);
      setAdminDropdownOpen(false);
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target as Node)) {
        setAdminDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Primary nav items - flat, direct links
  const primaryNavItems: NavItem[] = [
    { name: 'Home', path: '/' },
    { name: 'Events', path: '/events' },
    { name: 'Workshops', path: '/workshops' },
    { name: 'Speakers', path: '/speakers' },
    { name: 'About', path: '/about' },
  ];

  // Secondary items in "More" dropdown
  const moreItems: NavSubItem[] = [
    { name: 'Media', path: '/media' },
    { name: 'Partnerships', path: '/partnerships' },
    { name: 'Volunteers', path: '/cfv' },
    { name: 'Contact', path: '/contact' },
    { name: 'T-shirts', path: '/tshirt' },
    { name: 'Donate', path: '/buy-us-a-coffee' },
  ];

  // Admin items
  const adminItems: NavSubItem[] = [
    { name: 'Dashboard', path: '/admin' },
    { name: 'Users', path: '/admin/users' },
    { name: 'Feedback', path: '/admin/feedback-analytics' },
    { name: 'Coupons', path: '/admin/coupons' },
  ];

  const isActivePath = (path: string) => router.pathname === path;

  return (
    <header
      className={`w-full fixed top-0 left-0 right-0 z-[60] transition-all duration-300 ${
        scrolled
          ? 'bg-white shadow-md py-2'
          : 'bg-transparent py-3 lg:py-4'
      }`}
    >
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Logo
                textClasses={scrolled ? 'fill-black' : 'fill-black'}
                className="h-5 w-auto"
              />
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {/* Primary nav items */}
            {primaryNavItems.map((item) => (
              <Link
                key={item.name}
                href={item.path || '/'}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActivePath(item.path || '/')
                    ? 'text-blue-600 bg-blue-50'
                    : scrolled
                    ? 'text-gray-700 hover:text-black hover:bg-gray-100'
                    : 'text-black/80 hover:text-black hover:bg-black/5'
                }`}
              >
                {item.name}
              </Link>
            ))}

            {/* More dropdown */}
            <div
              ref={moreDropdownRef}
              className="relative"
              onMouseEnter={() => setMoreDropdownOpen(true)}
              onMouseLeave={() => setMoreDropdownOpen(false)}
            >
              <button
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  scrolled
                    ? 'text-gray-700 hover:text-black hover:bg-gray-100'
                    : 'text-black/80 hover:text-black hover:bg-black/5'
                }`}
                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
              >
                More
                <ChevronDown size={16} className={`transition-transform ${moreDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {moreDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-2 min-w-[180px] z-50"
                  >
                    {/* Invisible bridge to prevent gap */}
                    <div className="absolute -top-2 left-0 right-0 h-2" />
                    {moreItems.map((item) => (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={`block px-4 py-2.5 text-sm transition-colors ${
                          isActivePath(item.path)
                            ? 'text-blue-600 bg-blue-50'
                            : 'text-gray-700 hover:text-black hover:bg-gray-50'
                        }`}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Admin dropdown (if admin) */}
            {isAdmin && (
              <div
                ref={adminDropdownRef}
                className="relative"
                onMouseEnter={() => setAdminDropdownOpen(true)}
                onMouseLeave={() => setAdminDropdownOpen(false)}
              >
                <button
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-red-600 hover:bg-red-50`}
                  onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                >
                  <Settings size={16} />
                  Admin
                  <ChevronDown size={16} className={`transition-transform ${adminDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {adminDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg border border-red-100 py-2 min-w-[160px] z-50"
                    >
                      <div className="absolute -top-2 left-0 right-0 h-2" />
                      {adminItems.map((item) => (
                        <Link
                          key={item.path}
                          href={item.path}
                          className={`block px-4 py-2.5 text-sm transition-colors ${
                            isActivePath(item.path)
                              ? 'text-red-600 bg-red-50'
                              : 'text-gray-700 hover:text-red-600 hover:bg-red-50'
                          }`}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Divider */}
            <div className={`w-px h-6 mx-2 ${scrolled ? 'bg-gray-200' : 'bg-black/10'}`} />

            {/* Auth section */}
            <SignedIn>
              <Link
                href="/profile"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  router.pathname.startsWith('/profile')
                    ? 'text-blue-600 bg-blue-50'
                    : scrolled
                    ? 'text-gray-700 hover:text-black hover:bg-gray-100'
                    : 'text-black/80 hover:text-black hover:bg-black/5'
                }`}
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
                <button
                  ref={signInButtonRef}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    scrolled
                      ? 'text-gray-700 hover:text-black hover:bg-gray-100'
                      : 'text-black/80 hover:text-black hover:bg-black/5'
                  }`}
                >
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>

            {/* Primary CTA - Submit a Talk */}
            <Link
              href="/cfp"
              className="ml-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              style={{ backgroundColor: COLORS.primaryBlue }}
            >
              Submit a Talk
              <ArrowRight size={16} />
            </Link>
          </nav>

          {/* Mobile: CTA + Menu button */}
          <div className="lg:hidden flex items-center gap-3">
            <Link
              href="/cfp"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: COLORS.primaryBlue }}
            >
              Speak
              <ArrowRight size={14} />
            </Link>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`p-2 rounded-lg transition-colors ${
                scrolled ? 'text-black hover:bg-gray-100' : 'text-black hover:bg-black/5'
              }`}
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden bg-white border-t border-gray-100 overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4">
              {/* Auth section */}
              <div className="pb-4 mb-4 border-b border-gray-100">
                <SignedIn>
                  <div className="flex items-center justify-between">
                    <Link
                      href="/profile"
                      className="text-gray-900 font-medium hover:text-blue-600 transition-colors"
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
                    <button
                      ref={signInButtonRef}
                      className="w-full py-3 px-4 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      Sign In
                    </button>
                  </SignInButton>
                </SignedOut>
              </div>

              {/* Primary CTA - prominent on mobile */}
              <Link
                href="/cfp"
                className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl text-white font-semibold mb-4 transition-all hover:opacity-90"
                style={{ backgroundColor: COLORS.primaryBlue }}
              >
                Submit a Talk
                <ArrowRight size={18} />
              </Link>

              {/* Navigation links */}
              <nav className="space-y-1">
                {primaryNavItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.path || '/'}
                    className={`block py-3 px-3 rounded-lg font-medium transition-colors ${
                      isActivePath(item.path || '/')
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-700 hover:text-black hover:bg-gray-50'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}

                {/* Divider */}
                <div className="py-2">
                  <div className="h-px bg-gray-100" />
                </div>

                {/* More items */}
                <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  More
                </p>
                {moreItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`block py-3 px-3 rounded-lg font-medium transition-colors ${
                      isActivePath(item.path)
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-700 hover:text-black hover:bg-gray-50'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}

                {/* Admin section */}
                {isAdmin && (
                  <>
                    <div className="py-2">
                      <div className="h-px bg-gray-100" />
                    </div>
                    <p className="px-3 py-2 text-xs font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1">
                      <Settings size={12} />
                      Admin
                    </p>
                    {adminItems.map((item) => (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={`block py-3 px-3 rounded-lg font-medium transition-colors ${
                          isActivePath(item.path)
                            ? 'text-red-600 bg-red-50'
                            : 'text-gray-700 hover:text-red-600 hover:bg-red-50'
                        }`}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </>
                )}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
