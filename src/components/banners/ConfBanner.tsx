import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';

export interface ConfBannerSlide {
  id: string;
  content: React.ReactNode;
  highlight?: string;
}

interface ConfBannerProps {
  ticketsSold?: number;
  totalBlindBirdTickets?: number;
  className?: string;
}

const CONF_URL = 'https://conf.zurichjs.com';
const UTM_PARAMS = '?utm_source=zurichjs&utm_medium=website&utm_campaign=conf2026&utm_content=banner';

export default function ConfBanner({
  ticketsSold = 0,
  totalBlindBirdTickets = 30,
  className = '',
}: ConfBannerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const blindBirdRemaining = Math.max(0, totalBlindBirdTickets - ticketsSold);
  const isBlindBirdSoldOut = blindBirdRemaining === 0;

  const slides: ConfBannerSlide[] = [
    {
      id: 'tickets',
      content: isBlindBirdSoldOut ? (
        <>
          <span className="font-bold text-[#F7DF1E]">Early Bird Tickets</span> are now on sale!
        </>
      ) : (
        <>
          <span className="font-bold text-[#F7DF1E]">Blind Bird Tickets</span> are now on sale! Only{' '}
          <span className="font-bold text-[#F7DF1E]">{blindBirdRemaining}</span> left!
        </>
      ),
      highlight: isBlindBirdSoldOut ? 'Early Bird' : `${blindBirdRemaining} left`,
    },
    {
      id: 'date',
      content: (
        <>
          Save the date: <span className="font-bold text-[#F7DF1E]">11th September 2026</span>
        </>
      ),
      highlight: '11 Sept 2026',
    },
    {
      id: 'warmup',
      content: (
        <>
          Join our <span className="font-bold text-[#F7DF1E]">warm-up events</span> leading to the conference
        </>
      ),
      highlight: 'Warm-up Events',
    },
    {
      id: 'speakers',
      content: (
        <>
          Featuring <span className="font-bold text-[#F7DF1E]">international speakers</span> from around the world
        </>
      ),
      highlight: 'International Speakers',
    },
  ];

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(nextSlide, 4000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const handleDotClick = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div
      className={`w-full bg-[#242528] text-white overflow-hidden ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3 gap-4">
          {/* Conference Badge */}
          <a
            href={`${CONF_URL}${UTM_PARAMS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 hidden sm:flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-[#F7DF1E] font-bold text-sm">ZurichJS</span>
            <span className="bg-[#F7DF1E] text-[#242528] text-xs font-bold px-2 py-0.5 rounded">CONF 2026</span>
          </a>

          {/* Carousel Content */}
          <div className="flex-1 flex items-center justify-center min-w-0 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={slides[currentSlide].id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-sm sm:text-base text-center whitespace-nowrap overflow-hidden text-ellipsis"
              >
                {slides[currentSlide].content}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Dots */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => handleDotClick(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide
                      ? 'bg-[#F7DF1E] w-4'
                      : 'bg-gray-500 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            {/* CTA Button */}
            <motion.a
              href={`${CONF_URL}${UTM_PARAMS}`}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-[#F7DF1E] text-[#242528] px-3 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-bold hover:bg-[#f5d800] transition-colors flex items-center gap-1.5"
            >
              <span className="hidden sm:inline">Get Tickets</span>
              <span className="sm:hidden">Tickets</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.a>
          </div>
        </div>
      </div>
    </div>
  );
}
