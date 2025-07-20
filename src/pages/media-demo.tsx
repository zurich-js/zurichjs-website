import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function MediaDemo() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to media page with AI fun mode enabled
    router.replace('/media?ai=true');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-lg font-medium">Loading AI Fun Mode...</p>
      </div>
    </div>
  );
} 