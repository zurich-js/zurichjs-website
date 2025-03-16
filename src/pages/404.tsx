/* eslint-disable react/jsx-no-comment-textnodes */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useEvents from '@/hooks/useEvents';
import useReferrerTracking from '@/hooks/useReferrerTracking';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/SEO';

export default function Custom404() {
  const [randomError, setRandomError] = useState('');
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const { track } = useEvents();

  useReferrerTracking({
    eventName: '404_referral',
    trackOnlyExternal: false,
    onTrack: (info) => {
      console.log('404 referrer tracked:', info);
    }
  });

  useEffect(() => {
    // Mark that we're on the client side
    setIsClient(true);
    
    // Set random error message on client-side only to avoid hydration mismatch
    const errorMessages = [
      "TypeError: Cannot read property 'page' of undefined",
      "SyntaxError: Unexpected token '404'",
      "ReferenceError: page is not defined",
      "RangeError: Page index out of bounds",
      "URIError: URI malformed (or just lost)",
    ];
    setRandomError(errorMessages[Math.floor(Math.random() * errorMessages.length)]);

    // Track the 404 event with page information
    track('404_error', {
      attempted_path: router.asPath,
      timestamp: new Date().toISOString()
    });
  }, [router.asPath, track]);

  return (
    <Layout>
      <SEO
        title="404 - Page Not Found | ZurichJS"
        description="Oops! The page you're looking for doesn't exist."
      />

      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-yellow-400 to-amber-500 text-gray-900 font-mono p-4 pt-24">
        <main className="flex flex-col items-center justify-center max-w-3xl">
          {/* Console-like error display */}
          <div className="w-full mb-8 rounded-lg overflow-hidden shadow-2xl">
            {/* Console header */}
            <div className="bg-gray-800 px-4 py-2 flex items-center">
              <div className="flex mr-4">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="text-gray-400 text-sm">console.error</div>
            </div>

            {/* Console body */}
            <div className="bg-gray-950 p-4 text-sm text-gray-200">
              <div className="flex mb-1">
                <span className="text-gray-500 w-8 text-right mr-4">1</span>
                <span className="text-red-400 font-bold">{isClient ? randomError : "Error: Page not found"}</span>
              </div>
              <div className="flex mb-1">
                <span className="text-gray-500 w-8 text-right mr-4">2</span>
                <span>
                  at <span className="text-blue-400">findPage</span>(<span className="text-green-400">app.js:404:42</span>)
                </span>
              </div>
              <div className="flex mb-1">
                <span className="text-gray-500 w-8 text-right mr-4">3</span>
                <span>
                  at <span className="text-blue-400">renderRoute</span>(<span className="text-green-400">router.js:42:11</span>)
                </span>
              </div>
              <div className="flex mb-1">
                <span className="text-gray-500 w-8 text-right mr-4">4</span>
                <span>
                  at <span className="text-blue-400">Promise.then.catch</span>(<span className="text-green-400">async:63:13</span>)
                </span>
              </div>
              <div className="flex mb-1">
                <span className="text-gray-500 w-8 text-right mr-4">5</span>
                <span className="text-gray-500 italic">// Have you tried turning it off and on again?</span>
              </div>
              <div className="flex mb-1">
                <span className="text-gray-500 w-8 text-right mr-4">6</span>
                <span>
                  <span className="text-purple-400">const</span> <span className="text-yellow-300">solution</span> = <span className="text-green-400">&quot;Go back to homepage&quot;</span>;
                </span>
              </div>
              <div className="flex mb-1">
                <span className="text-gray-500 w-8 text-right mr-4">7</span>
                <span>
                  <span className="text-purple-400">const</span> <span className="text-yellow-300">attemptedPath</span> = <span className="text-green-400">&quot;{isClient ? router.asPath : '/404'}&quot;</span>;
                </span>
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-4 text-center text-black">
            <span className="bg-gray-900 text-yellow-400 px-2 py-1 rounded">404</span> - Page Not Found
          </h1>

          <p className="text-xl mb-6 text-center text-black">
            Looks like this page is <span className="bg-gray-900 px-2 py-1 rounded text-yellow-400">undefined</span>
          </p>

          <Link href="/" className="bg-gray-900 text-yellow-400 px-6 py-3 rounded-md hover:bg-gray-800 transition-all transform hover:-translate-y-1 font-bold">
            {`console.log('Take me home')`}
          </Link>

        </main>
      </div>
    </Layout>
  );
} 