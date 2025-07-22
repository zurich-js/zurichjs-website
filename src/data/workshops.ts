import { Workshop, WorkshopState } from '@/components/sections/UpcomingWorkshops';

export type { WorkshopState };

export const getWorkshops = (): Workshop[] => {
  const workshops: Workshop[] = [
    {
      id: 'astro-zero-to-hero',
      title: 'Astro: Zero to Hero',
      subtitle: 'Build High-Performance Websites with Astro',
      description: "Master Astro's Island Architecture in this intensive 4-hour workshop. Learn to build lightning-fast websites that ship zero JavaScript by default and integrate with your favorite frameworks.",
      dateInfo: 'July 23, 2025',
      timeInfo: '17:30 - 20:30',
      locationInfo: 'ORBIZ Josef, Josefstrasse 214a, 8005 Zürich',
      maxAttendees: 15,
      image: '/images/workshops/astro-zero-to-hero.png',
      iconColor: '#0284c7', // sky-600
      tag: '🚀 Web Performance',
      speakerId: 'elian-van-cutsem',
      state: 'confirmed' as WorkshopState
    },
    // {
    //   id: 'accessibility-fundamentals',
    //   title: 'Web Accessibility Fundamentals',
    //   subtitle: 'Building Inclusive Digital Experiences',
    //   description: 'Learn how to create accessible web applications that comply with WCAG standards and the European Accessibility Act.',
    //   dateInfo: 'TBD',
    //   timeInfo: 'TBD',
    //   locationInfo: 'TBD',
    //   maxAttendees: 15,
    //   image: '/images/workshops/web-accessibility.png',
    //   iconColor: '#0284c7', // sky-600
    //   tag: '🌐 Accessibility',
    //   speakerId: 'aleksej-dix',
    //   state: 'interest' as WorkshopState
    // },
    // {
    //   id: 'react-performance',
    //   title: 'React & Next.js Performance Optimization',
    //   subtitle: 'Strategies for Blazing Fast Applications',
    //   description: 'Master advanced techniques to optimize your React and Next.js applications for maximum performance and user experience.',
    //   dateInfo: 'TBD',
    //   timeInfo: 'TBD',
    //   locationInfo: 'TBD',
    //   maxAttendees: 15,
    //   image: '/images/workshops/react-performance.png',
    //   iconColor: '#2563eb', // blue-600
    //   tag: '🚀 React & Next.js Performance',
    //   speakerId: 'faris-aziz',
    //   state: 'interest' as WorkshopState
    // },
    {
      id: 'ai-edge-application',
      title: 'Building a Full-Stack AI Application on the Edge',
      subtitle: 'Master Cloudflare Workers & AI Integration',
      description: 'Ready to build lightning-fast AI applications that scale globally? Master the Cloudflare Developer Platform by building a complete full-stack AI application from scratch with Workers, AI capabilities, databases, and React.',
      dateInfo: 'September 9, 2025',
      timeInfo: '18:00 - 20:30',
      locationInfo: 'Smallpdf AG, Steinstrasse 21, 8003 Zürich',
      maxAttendees: 20,
      image: '/images/workshops/ai-powered-js-apps.png',
      iconColor: '#f59e0b', // amber-500
      tag: '🤖 AI & Edge Computing',
      speakerId: 'speaker-c6fff8ee-97c5-4db1-8d6c-fb90ad1376e9',
      state: 'confirmed' as WorkshopState
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
