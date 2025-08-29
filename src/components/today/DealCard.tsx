import Link from 'next/link';
import { useState, useEffect } from 'react';

interface Deal {
  title: string;
  description: string;
  workshopHref: string;
  expiresAt: Date;
  discount: string;
}

interface DealCardProps {
  deal: Deal;
}

export default function DealCard({ deal }: DealCardProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, expired: false });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = deal.expiresAt.getTime();
      const difference = expiry - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        return { hours, minutes, seconds, expired: false };
      } else {
        return { hours: 0, minutes: 0, seconds: 0, expired: true };
      }
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [deal.expiresAt, mounted]);

  if (!mounted) {
    return (
      <div className="bg-gradient-to-br from-zurich to-blue-600 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border-4 border-js">
        <div className="absolute top-4 right-4 text-2xl animate-pulse">🔥</div>
        <div className="text-center">
          <div className="text-2xl font-black mb-2">🎁 DEAL OF THE DAY</div>
          <div className="text-lg font-bold mb-4">{deal.title}</div>
          <div className="text-sm opacity-90">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-zurich to-blue-600 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border-4 border-js">
      {!timeLeft.expired && (
        <div className="absolute top-4 right-4 text-2xl animate-bounce">
          🔥
        </div>
      )}
      
      <div className="text-center space-y-4">
        <div className="text-2xl font-black">
          {timeLeft.expired ? '😭 DEAL ENDED' : '🎁 DEAL OF THE DAY'}
        </div>
        
        <div className="text-xl font-bold">
          {deal.title}
        </div>
        
        <div className="text-sm opacity-90">
          {deal.description}
        </div>

        {!timeLeft.expired ? (
          <>
            <div className="bg-black/20 rounded-2xl p-4">
              <div className="text-sm font-bold mb-2">⏰ ENDS IN</div>
              <div className="flex justify-center gap-2">
                <div className="bg-white text-black rounded-lg px-3 py-2 min-w-[50px]">
                  <div className="font-black text-lg">{timeLeft.hours}</div>
                  <div className="text-xs font-bold opacity-70">hrs</div>
                </div>
                <div className="bg-white text-black rounded-lg px-3 py-2 min-w-[50px]">
                  <div className="font-black text-lg">{timeLeft.minutes}</div>
                  <div className="text-xs font-bold opacity-70">min</div>
                </div>
                <div className="bg-white text-black rounded-lg px-3 py-2 min-w-[50px]">
                  <div className="font-black text-lg">{timeLeft.seconds}</div>
                  <div className="text-xs font-bold opacity-70">sec</div>
                </div>
              </div>
            </div>
            
            <Link
              href={deal.workshopHref}
              className="block bg-js hover:bg-js-dark text-black font-black py-4 px-6 rounded-2xl transition-all duration-200 active:scale-95 shadow-lg"
            >
              💎 GET {deal.discount} OFF NOW!
            </Link>
          </>
        ) : (
          <div className="bg-gray-500 text-white py-4 px-6 rounded-2xl font-bold">
            💔 Deal Expired
          </div>
        )}

        <div className="text-xs opacity-75">
          Valid 24hrs after meetup • Attendees only
        </div>
      </div>
    </div>
  );
}