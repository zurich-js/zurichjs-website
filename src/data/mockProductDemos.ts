export interface ProductDemo {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
}

interface Talk {
  id: string;
  title: string;
  description?: string;
  productDemo?: ProductDemo | null;
  // Add other common properties
  speakers?: Array<{ id: string; name: string }>;
  durationMinutes?: number;
  slides?: string;
  videoUrl?: string;
  // Using a more specific index signature with no 'any'
  [key: string]: string | number | boolean | ProductDemo | null | Array<unknown> | undefined;
}

// Sample product demos for testing the product feedback feature
export const mockProductDemos: ProductDemo[] = [
  {
    id: 'sonarqube',
    name: 'SonarQube',
    description: 'Static code analysis tool that helps developers write cleaner and safer code.',
    logoUrl: 'https://avatars.githubusercontent.com/u/545988?s=280&v=4',
    websiteUrl: 'https://www.sonarqube.org/'
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

// Helper function to get a demo by ID
export const getProductDemoById = (id: string): ProductDemo | undefined => {
  return mockProductDemos.find(demo => demo.id === id);
};

// Add a product demo to a talk for testing purposes
export const addProductDemoToTalk = (talk: Talk, demoId: string): Talk => {
  const demo = getProductDemoById(demoId);
  if (!demo) return talk;
  
  return {
    ...talk,
    productDemo: demo
  };
}; 