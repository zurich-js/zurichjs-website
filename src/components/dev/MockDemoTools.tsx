import React from 'react';

// Define types
interface ProductDemo {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  websiteUrl: string;
}

interface Talk {
  id: string;
  title: string;
  productDemo?: ProductDemo | null;
  [key: string]: string | number | boolean | ProductDemo | null | unknown[] | undefined;
}

interface Event {
  id: string;
  title: string;
  talks: Talk[];
  [key: string]: string | number | boolean | Talk[] | unknown[] | undefined;
}

// Mock product demos without relying on external types
const mockDemos: ProductDemo[] = [
  {
    id: 'sonarqube',
    name: 'SonarQube',
    description: 'Static code analysis tool that helps developers write cleaner and safer code.',
    logoUrl: 'https://avatars.githubusercontent.com/u/545988?s=280&v=4',
    websiteUrl: 'https://www.sonarqube.org/'
  },
  {
    id: 'imagekit',
    name: 'ImageKit',
    description: 'Real-time image optimization and transformation service.',
    logoUrl: 'https://avatars.githubusercontent.com/u/34096591?s=280&v=4',
    websiteUrl: 'https://imagekit.io/'
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payment processing platform for internet businesses.',
    logoUrl: 'https://avatars.githubusercontent.com/u/856813?s=280&v=4',
    websiteUrl: 'https://stripe.com/'
  },
  {
    id: 'sentry',
    name: 'Sentry',
    description: 'Application monitoring and error tracking software.',
    logoUrl: 'https://avatars.githubusercontent.com/u/1396951?s=280&v=4',
    websiteUrl: 'https://sentry.io/'
  },
  {
    id: 'auth0',
    name: 'Auth0',
    description: 'Authentication and authorization platform.',
    logoUrl: 'https://cdn.auth0.com/website/bob/press/logo-light.png',
    websiteUrl: 'https://auth0.com/'
  }
];

interface MockDemoToolsProps {
  event: Event;
  onUpdateEvent: (updatedEvent: Event) => void;
}

const MockDemoTools: React.FC<MockDemoToolsProps> = ({ event, onUpdateEvent }) => {
  // Only show in development
  if (process.env.NODE_ENV === 'production') return null;
  
  const addMockDemos = () => {
    // Clone the event and talks
    const updatedEvent = {
      ...event,
      talks: [...event.talks]
    };
    
    // Add demos to the first 3 talks, or as many as are available
    for (let i = 0; i < Math.min(updatedEvent.talks.length, mockDemos.length); i++) {
      updatedEvent.talks[i] = {
        ...updatedEvent.talks[i],
        productDemo: mockDemos[i]
      };
    }
    
    // Update the event
    onUpdateEvent(updatedEvent);
  };
  
  const clearMockDemos = () => {
    // Remove all product demos
    const updatedEvent = {
      ...event,
      talks: event.talks.map(talk => ({
        ...talk,
        productDemo: null
      }))
    };
    
    // Update the event
    onUpdateEvent(updatedEvent);
  };
  
  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg z-50 text-sm">
      <h3 className="text-yellow-400 font-bold mb-2">Product Demo Tools</h3>
      <div className="space-y-2">
        <button 
          onClick={addMockDemos} 
          className="block w-full bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded"
        >
          Add Mock Product Demos
        </button>
        <button 
          onClick={clearMockDemos} 
          className="block w-full bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded"
        >
          Clear Product Demos
        </button>
      </div>
      <div className="mt-2 text-xs text-gray-400">
        {event.talks.filter(talk => talk.productDemo).length} talks have product demos
      </div>
    </div>
  );
};

export default MockDemoTools; 