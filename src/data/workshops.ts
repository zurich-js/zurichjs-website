import { Workshop, WorkshopState } from '@/components/sections/UpcomingWorkshops';

export const getWorkshops = (): Workshop[] => {
  const workshops: Workshop[] = [
    {
      id: 'laravel-reverb',
      title: 'From Scratch to Real-Time with Laravel & Reverb',
      subtitle: 'Building a mini-project tracker with Laravel',
      description: 'Learn to build a functional mini-project tracker app with real-time features using Laravel & Reverb. Perfect for developers new to Laravel or those with early-intermediate level experience.',
      dateInfo: 'July 23, 2025',
      timeInfo: '17:30 - 21:30',
      locationInfo: 'Zürich (Venue TBD)',
      maxAttendees: 15,
      image: '/images/workshops/laravel-reverb.png',
      iconColor: '#ef4444', // red-500
      tag: '⚡ Real-Time Web',
      speakerId: 'bert-de-swaef',
      state: 'confirmed' as WorkshopState
    },
    {
      id: 'astro-zero-to-hero',
      title: 'Astro: Zero to Hero',
      subtitle: 'Build High-Performance Websites with Astro',
      description: "Master Astro's Island Architecture in this intensive 4-hour workshop. Learn to build lightning-fast websites that ship zero JavaScript by default and integrate with your favorite frameworks.",
      dateInfo: 'July 23, 2025',
      timeInfo: '17:30 - 21:30',
      locationInfo: 'Zürich (Venue TBD)',
      maxAttendees: 15,
      image: '/images/workshops/astro-zero-to-hero.png',
      iconColor: '#0284c7', // sky-600
      tag: '🚀 Web Performance',
      speakerId: 'elian-van-cutsem',
      state: 'confirmed' as WorkshopState
    },
    {
      id: 'accessibility-fundamentals',
      title: 'Web Accessibility Fundamentals',
      subtitle: 'Building Inclusive Digital Experiences',
      description: 'Learn how to create accessible web applications that comply with WCAG standards and the European Accessibility Act.',
      dateInfo: 'TBD',
      timeInfo: 'TBD',
      locationInfo: 'TBD',
      maxAttendees: 15,
      image: '/images/workshops/web-accessibility.png',
      iconColor: '#0284c7', // sky-600
      tag: '🌐 Accessibility',
      speakerId: 'aleksej-dix',
      state: 'interest' as WorkshopState
    },
    {
      id: 'react-performance',
      title: 'React & Next.js Performance Optimization',
      subtitle: 'Strategies for Blazing Fast Applications',
      description: 'Master advanced techniques to optimize your React and Next.js applications for maximum performance and user experience.',
      dateInfo: 'TBD',
      timeInfo: 'TBD',
      locationInfo: 'TBD',
      maxAttendees: 15,
      image: '/images/workshops/react-performance.png',
      iconColor: '#2563eb', // blue-600
      tag: '🚀 React & Next.js Performance',
      speakerId: 'faris-aziz',
      state: 'interest' as WorkshopState
    },
  ];

  return workshops;
};

// Helper function to get only confirmed workshops
export const getConfirmedWorkshops = (): Workshop[] => {
  return getWorkshops().filter(workshop => workshop.state === 'confirmed');
};

// Helper function to get upcoming workshops for homepage
export const getUpcomingWorkshops = (): Workshop[] => {
  return getConfirmedWorkshops().slice(0, 3); // Only return the first 3 for homepage
}; 