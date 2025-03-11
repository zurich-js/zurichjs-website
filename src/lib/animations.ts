// lib/animations.js
import { useInView } from 'react-intersection-observer';
import { useAnimation } from 'framer-motion';
import { useEffect } from 'react';

// Animation variants for common components
export const animationVariants = {
  // Fade up animation (for content blocks, cards, etc.)
  fadeUp: {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6, 
        ease: 'easeOut'
      }
    }
  },
  
  // Staggered children animation (for grids, lists, etc.)
  staggerChildren: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      }
    }
  },
  
  // Animation for individual staggered items
  staggerItem: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { 
        duration: 0.5,
        ease: 'easeOut'
      }
    }
  },
  
  // Subtle scale animation for cards and interactive elements
  scaleUp: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 0.5 
      }
    }
  },
  
  // Hero section animation
  hero: {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.2,
        delayChildren: 0.1,
        duration: 0.8 
      }
    }
  },
  
  // Hero text animation
  heroText: {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6,
        ease: 'easeOut'
      }
    }
  },
  
  // Hero image/visual animation
  heroVisual: {
    hidden: { opacity: 0, scale: 0.9, rotate: -5 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      rotate: 0,
      transition: { 
        duration: 0.8,
        ease: 'easeOut',
        delay: 0.2
      }
    }
  },
  
  // Path drawing animation (for logos, icons, etc.)
  drawPath: {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { 
      pathLength: 1, 
      opacity: 1,
      transition: { 
        pathLength: { duration: 1.5, ease: "easeInOut" },
        opacity: { duration: 0.3 }
      }
    }
  },
  
  // Button hover animation
  buttonHover: {
    initial: { scale: 1 },
    hover: { 
      scale: 1.05,
      transition: { 
        duration: 0.2 
      }
    },
    tap: { 
      scale: 0.98,
      transition: { 
        duration: 0.1 
      }
    }
  },
  
  // List item hover animation
  listItemHover: {
    initial: { x: 0 },
    hover: { 
      x: 5,
      transition: { 
        duration: 0.2 
      }
    }
  },
  
  // Card hover animation
  cardHover: {
    initial: { y: 0, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
    hover: { 
      y: -5,
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
      transition: { 
        duration: 0.2 
      }
    }
  },
  
  // Bouncy animation for attention-grabbing elements
  bounce: {
    initial: { y: 0 },
    animate: {
      y: [-10, 0, -6, 0, -2, 0],
      transition: {
        duration: 1.5,
        ease: "easeInOut",
        times: [0, 0.2, 0.4, 0.6, 0.8, 1],
        repeat: Infinity,
        repeatDelay: 3
      }
    }
  },
  
  // Pulse animation for highlights and notifications
  pulse: {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
      transition: {
        duration: 2,
        ease: "easeInOut",
        times: [0, 0.5, 1],
        repeat: Infinity
      }
    }
  }
};

// Custom hook for scroll-triggered animations
export function useScrollAnimation() {
  const controls = useAnimation();
  const [ref, inView] = useInView({
    threshold: 0.2,  // Element is considered in view when 20% visible
    triggerOnce: true  // Animation triggers only once
  });
  
  useEffect(() => {
    if (inView) {
      controls.start('visible');
    }
  }, [controls, inView]);
  
  return { ref, controls, inView };
}

// Animation for the JS logo
export const jsLogoAnimation = {
  initial: { pathLength: 0, opacity: 0 },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 2, ease: "easeInOut" },
      opacity: { duration: 0.3 }
    }
  }
};

// Text reveal animation for headings and important text
export const textRevealAnimation = {
  initial: { y: 100, opacity: 0 },
  animate: (i = 0) => ({
    y: 0,
    opacity: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: [0.33, 1, 0.68, 1]
    }
  })
};

// Background pattern animation
export const bgPatternAnimation = {
  initial: { opacity: 0, scale: 1.1 },
  animate: {
    opacity: [0, 0.05, 0.1, 0.05, 0.1],
    scale: [1.1, 1.05, 1, 1.05, 1],
    transition: {
      duration: 20,
      ease: "linear",
      repeat: Infinity,
      repeatType: "reverse"
    }
  }
};

// Animated counting for statistics
export function useCountAnimation(end, duration = 2) {
  const controls = useAnimation();
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });
  
  useEffect(() => {
    if (inView) {
      controls.start({
        value: end,
        transition: {
          duration: duration,
          ease: "easeOut"
        }
      });
    }
  }, [controls, inView, end, duration]);
  
  return { ref, controls };
}

// Staggered grid animation
export function useStaggeredAnimation(childCount) {
  const controls = useAnimation();
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });
  
  useEffect(() => {
    if (inView) {
      controls.start(i => ({
        opacity: 1,
        y: 0,
        transition: {
          delay: i * 0.1,
          duration: 0.5,
          ease: "easeOut"
        }
      }));
    }
  }, [controls, inView]);
  
  return { ref, controls };
}

// Special animation for the "JS" text in the logo
export const jsTextAnimation = {
  initial: { scale: 0.8, opacity: 0 },
  animate: {
    scale: [0.8, 1.2, 1],
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: "easeOut"
    }
  }
};

// Confetti animation for celebrations (new events, etc.)
export function triggerConfetti() {
  // This would be implemented with a library like canvas-confetti
  // But here's a placeholder for the function
  if (typeof window !== 'undefined' && window.confetti) {
    window.confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
}