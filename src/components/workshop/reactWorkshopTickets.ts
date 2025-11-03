import { TicketOption } from './TicketSelection';

export const reactWorkshopTickets: TicketOption[] = [
  {
    id: 'price_1S6ZDpGxQziVA7FsJ1BAEHfQ', // Production price ID
    testPriceId: 'price_1S6ZDEGxQziVA7Fs4AuGXGz0', // Test price ID
    title: 'React Crash Course',
    description: 'Access to Real-World React: The Architectural Crash Course for Scalability, Resilience, and Observability (feat. Next.js)',
    price: 250,
    ticketType: 'workshop',
    workshopId: 'react-architecture',
    features: [
      '3 hour intensive crash course',
      'Component architecture for implicit performance',
      'React reconciliation deep dive',
      'Resilience engineering patterns',
      'Circuit breaker and retry implementations',
      'DORA metrics for frontend teams',
      'Post-deployment confidence with observability',
      'Feature flags and safe rollouts',
      'Workshop materials and code repository',
      'Refreshments provided',
      'Networking opportunities with peers'
    ]
  }
];