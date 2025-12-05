import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';

interface ConfBannerProps {
  className?: string;
}

const CONF_URL = 'https://conf.zurichjs.com';
const UTM_PARAMS = '?utm_source=zurichjs&utm_medium=website&utm_campaign=conf2026&utm_content=banner';

const slides = [
  { text: 'Blind Bird tickets on sale', short: 'Blind Bird on sale' },
  { text: 'September 11, 2026', short: 'Sept 11, 2026' },
  { text: 'International speakers', short: 'Global speakers' },
];

export default function ConfBanner({ className = '' }: ConfBannerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(nextSlide, 3000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  return (
    <motion.a
      href={`${CONF_URL}${UTM_PARAMS}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block w-full bg-black cursor-pointer ${className}`}
      whileHover={{ backgroundColor: '#1a1a1a' }}
    >
      <div className="px-4 py-3 sm:py-2.5">
        <div className="flex items-center justify-center gap-2.5 sm:gap-3">
          {/* Badge */}
          <span className="bg-[#F7DF1E] text-black text-xs font-bold px-2 py-1 sm:py-0.5 rounded whitespace-nowrap flex-shrink-0">
            ZurichJS Conf
          </span>

          {/* Carousel text */}
          <div className="overflow-hidden min-w-0">
            <AnimatePresence mode="wait">
              <motion.span
                key={currentSlide}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="text-white text-sm font-medium block truncate"
              >
                <span className="hidden sm:inline">{slides[currentSlide].text}</span>
                <span className="sm:hidden">{slides[currentSlide].short}</span>
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Arrow */}
          <motion.span
            className="text-[#F7DF1E] text-sm flex-shrink-0"
            animate={{ x: [0, 3, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            →
          </motion.span>
        </div>
      </div>
    </motion.a>
  );
}
