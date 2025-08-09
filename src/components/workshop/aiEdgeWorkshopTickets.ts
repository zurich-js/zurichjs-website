import { TicketOption } from './TicketSelection';

export const aiEdgeWorkshopTickets: TicketOption[] = [
  {
    id: 'price_1Ro6NTGxQziVA7Fsf2m5GZtv', // Production price ID (using test ID provided)
    testPriceId: 'price_1RnN87GxQziVA7FsaSMjJPM1', // Test price ID
    title: 'AI Edge Workshop',
    description: 'Access to the Building a Full-Stack AI Application on the Edge Workshop',
    price: 95,
    ticketType: 'workshop',
    workshopId: 'ai-edge-application',
    features: [
      '2.5 hour hands-on workshop with 20 min break',
      'Complete AI application built from scratch',
      'Cloudflare Workers & AI integration',
      'Database and storage implementation',
      'Modern React frontend development',
      'Workshop materials and code examples',
      'Refreshments and snacks provided',
      'Networking opportunities'
    ]
  }
];

