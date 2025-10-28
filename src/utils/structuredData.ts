/**
 * Structured Data (JSON-LD) utilities for SEO
 * These help search engines and LLMs understand our content better
 */

interface Event {
  id: string;
  title: string;
  description: string;
  datetime: string;
  location: string;
  address?: string;
  image?: string;
  meetupUrl?: string;
  isProMeetup?: boolean;
  stripePriceId?: string;
}

interface Speaker {
  id: string;
  name: string;
  title: string;
  bio: string;
  image?: string;
  company?: string;
  linkedin?: string;
  twitter?: string;
  github?: string;
}

/**
 * Generate Organization structured data
 */
export const generateOrganizationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ZurichJS',
  alternateName: ['Zurich JavaScript', 'Zurich JS Meetup', 'ZurichJS Community'],
  url: 'https://zurichjs.com',
  logo: 'https://zurichjs.com/logo-square.png',
  description:
    'ZurichJS is the premier JavaScript and TypeScript community in Zurich, Switzerland. We host regular meetups, workshops, and conferences for web developers, featuring expert speakers covering React, Node.js, Vue, Angular, AI, and modern web development.',
  sameAs: [
    'https://twitter.com/zurichjs',
    'https://www.linkedin.com/company/zurichjs',
    'https://github.com/zurichjs',
    'https://www.meetup.com/zurich-js/',
  ],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Zurich',
    addressRegion: 'ZH',
    addressCountry: 'CH',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 47.3769,
    longitude: 8.5417,
  },
  areaServed: [
    {
      '@type': 'City',
      name: 'Zurich',
    },
    {
      '@type': 'City',
      name: 'Winterthur',
    },
    {
      '@type': 'City',
      name: 'Zug',
    },
    {
      '@type': 'City',
      name: 'Basel',
    },
    {
      '@type': 'City',
      name: 'Konstanz',
    },
    {
      '@type': 'City',
      name: 'St. Gallen',
    },
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'hello@zurichjs.com',
  },
  knowsAbout: [
    'JavaScript',
    'TypeScript',
    'React',
    'Node.js',
    'Vue.js',
    'Angular',
    'Web Development',
    'Frontend Development',
    'Backend Development',
    'Full Stack Development',
    'Artificial Intelligence',
    'Machine Learning',
    'Web Performance',
    'Software Engineering',
  ],
});

/**
 * Generate Event structured data
 */
export const generateEventSchema = (event: Event, priceAmount?: number) => {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    startDate: event.datetime,
    endDate: new Date(new Date(event.datetime).getTime() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours later
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.location,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.address,
        addressLocality: 'Zurich',
        addressRegion: 'ZH',
        addressCountry: 'CH',
      },
    },
    image: event.image ? [event.image] : ['https://zurichjs.com/logo-square.png'],
    organizer: {
      '@type': 'Organization',
      name: 'ZurichJS',
      url: 'https://zurichjs.com',
    },
    performer: {
      '@type': 'Organization',
      name: 'ZurichJS Community',
    },
  };

  // Add offers for paid events
  if (event.isProMeetup && priceAmount) {
    schema.offers = {
      '@type': 'Offer',
      url: `https://zurichjs.com/events/${event.id}`,
      price: priceAmount,
      priceCurrency: 'CHF',
      availability: 'https://schema.org/InStock',
      validFrom: new Date().toISOString(),
    };
  } else {
    schema.offers = {
      '@type': 'Offer',
      url: event.meetupUrl || `https://zurichjs.com/events/${event.id}`,
      price: 0,
      priceCurrency: 'CHF',
      availability: 'https://schema.org/InStock',
    };
  }

  return schema;
};

/**
 * Generate Person (Speaker) structured data
 */
export const generatePersonSchema = (speaker: Speaker) => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: speaker.name,
  jobTitle: speaker.title,
  description: speaker.bio,
  image: speaker.image,
  worksFor: speaker.company
    ? {
        '@type': 'Organization',
        name: speaker.company,
      }
    : undefined,
  sameAs: [speaker.linkedin, speaker.twitter, speaker.github].filter(Boolean),
});

/**
 * Generate BreadcrumbList structured data
 */
export const generateBreadcrumbSchema = (items: { name: string; url: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: `https://zurichjs.com${item.url}`,
  })),
});

/**
 * Generate WebSite structured data with search functionality
 */
export const generateWebSiteSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'ZurichJS',
  url: 'https://zurichjs.com',
  description:
    'The premier JavaScript and TypeScript community in Zurich, Switzerland. Regular meetups, workshops, and events for web developers.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://zurichjs.com/events?search={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
});

/**
 * Generate FAQPage structured data
 */
export const generateFAQSchema = (faqs: { question: string; answer: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
});

/**
 * Generate LocalBusiness structured data
 */
export const generateLocalBusinessSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': 'https://zurichjs.com/#organization',
  name: 'ZurichJS',
  image: 'https://zurichjs.com/logo-square.png',
  description:
    'Premier JavaScript and TypeScript meetup community in Zurich, offering free and paid events, workshops, and networking for developers.',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Zurich',
    addressRegion: 'ZH',
    postalCode: '8000',
    addressCountry: 'CH',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 47.3769,
    longitude: 8.5417,
  },
  url: 'https://zurichjs.com',
  telephone: '+41-XXX-XXX-XXXX', // Update with actual number if available
  email: 'hello@zurichjs.com',
  priceRange: 'Free - CHF 50',
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: '09:00',
    closes: '17:00',
  },
  sameAs: [
    'https://twitter.com/zurichjs',
    'https://www.linkedin.com/company/zurichjs',
    'https://github.com/zurichjs',
    'https://www.meetup.com/zurich-js/',
  ],
});

/**
 * Generate comprehensive structured data for homepage
 */
export const generateHomePageStructuredData = () => [
  generateOrganizationSchema(),
  generateWebSiteSchema(),
  generateLocalBusinessSchema(),
];
