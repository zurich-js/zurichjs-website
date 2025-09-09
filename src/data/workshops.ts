import { Workshop, WorkshopState } from '@/components/sections/UpcomingWorkshops';

export type { WorkshopState };

export const getWorkshops = (): Workshop[] => {
  const workshops: Workshop[] = [
    // {
    //   id: 'astro-zero-to-hero',
    //   title: 'Astro: Zero to Hero',
    //   subtitle: 'Build High-Performance Websites with Astro',
    //   description: "Master Astro's Island Architecture in this intensive 4-hour workshop. Learn to build lightning-fast websites that ship zero JavaScript by default and integrate with your favorite frameworks.",
    //   dateInfo: 'July 23, 2025',
    //   timeInfo: '17:30 - 20:30',
    //   locationInfo: 'ORBIZ Josef, Josefstrasse 214a, 8005 Zürich',
    //   maxAttendees: 15,
    //   image: '/images/workshops/astro-zero-to-hero.png',
    //   iconColor: '#0284c7', // sky-600
    //   tag: '🚀 Web Performance',
    //   speakerId: 'elian-van-cutsem',
    //   state: 'confirmed' as WorkshopState
    // },
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
      dateInfo: 'September 9th, 2025',
      timeInfo: '18:00 - 20:30',
      locationInfo: 'Smallpdf AG, Zürich',
      maxAttendees: 30,
      image: '/images/workshops/full-stack-ai-cloudflare.png',
      iconColor: '#f59e0b', // amber-500
      tag: '🤖 AI & Edge Computing',
      speakerId: 'speaker-c6fff8ee-97c5-4db1-8d6c-fb90ad1376e9',
      state: 'confirmed' as WorkshopState
    },
    {
      id: 'observability-dynatrace',
      title: 'Observability in Action: Hands-On with Dynatrace',
      subtitle: 'Master Modern System Observability & Monitoring',
      description: 'Learn to master modern observability with hands-on experience using Dynatrace. This workshop will teach you the three pillars of observability - metrics, logs, and traces - through practical exercises with the AstroShop application.',
      dateInfo: 'October 28, 2025',
      timeInfo: '16:00 - 18:00',
      locationInfo: 'Venue TBA, Zürich',
      maxAttendees: 25,
      // image: '/images/workshops/observability-dynatrace.png',
      iconColor: '#f97316', // orange-500
      tag: '📊 Observability & Monitoring',
      speakerId: 'speaker-e9fed3d8-151c-422f-9e43-bd20160183a6',
      state: 'confirmed' as WorkshopState
    },
    {
      id: 'ai-design-patterns-2026',
      title: 'Design Patterns For AI Interfaces In 2026',
      subtitle: 'Master AI UX Design & Build Better User Experiences',
      description: 'Master modern AI interface design through practical patterns that go beyond chatbots, creating experiences that help users articulate intent and get work done faster. Full-day intensive workshop with Vitaly Friedman.',
      dateInfo: 'March 23, 2026',
      timeInfo: '09:00 - 17:00',
      locationInfo: 'Venue TBA, Zürich',
      maxAttendees: 30,
      // image: '/images/workshops/ai-design-patterns-2026.png',
      iconColor: '#f59e0b', // amber-500
      tag: '🧠 AI Interface Design',
      speakerId: 'vitaly-friedman',
      state: 'confirmed' as WorkshopState
    },
    // Example workshop with no image (fallback) and multiple instructors
    // {
    //   id: 'javascript-fundamentals',
    //   title: 'JavaScript Fundamentals Workshop',
    //   subtitle: 'Master the Basics with Expert Guidance',
    //   description: 'Learn JavaScript fundamentals from the ground up with hands-on exercises and real-world examples. Perfect for beginners and those looking to solidify their foundation.',
    //   dateInfo: 'TBD',
    //   timeInfo: 'TBD',
    //   locationInfo: 'TBD',
    //   maxAttendees: 20,
    //   // No image property - will use fallback
    //   iconColor: '#3b82f6', // blue-500
    //   tag: '📚 JavaScript Basics',
    //   speakerId: 'faris-aziz', // Keep for backward compatibility
    //   speakerIds: ['faris-aziz', 'enrique-piqueras'], // Multiple instructors
    //   state: 'interest' as WorkshopState
    // },
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
