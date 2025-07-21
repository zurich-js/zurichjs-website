import { Workshop } from '@/components/sections/UpcomingWorkshops';

export const getWorkshops = (): Workshop[] => {
  const workshops: Workshop[] = [
    {
      id: 'astro-zero-to-hero',
      title: 'Astro: Zero to Hero',
      subtitle: 'Build High-Performance Websites with Astro',
      description: "Master Astro's Island Architecture in this intensive 4-hour workshop. Learn to build lightning-fast websites that ship zero JavaScript by default and integrate with your favorite frameworks.",
      dateInfo: 'July 23, 2025',
      timeInfo: '17:30 - 21:30',
      locationInfo: 'Zürich (Venue TBD)',
      maxAttendees: 15,
      price: '225 CHF',
      image: '/images/workshops/astro-zero-to-hero.png',
      level: 'intermediate',
      confirmedDate: true
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
      level: 'beginner',
      confirmedDate: false
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
      level: 'intermediate',
      confirmedDate: false
    },
  ];

  return workshops;
};

// Helper function to get only confirmed workshops
export const getConfirmedWorkshops = (): Workshop[] => {
  return getWorkshops().filter(workshop => workshop.confirmedDate === true);
};

// Helper function to get upcoming workshops for homepage
export const getUpcomingWorkshops = (): Workshop[] => {
  return getConfirmedWorkshops().slice(0, 3); // Only return the first 3 for homepage
};
