import { TicketOption } from './TicketSelection';

export const reactWorkshopTickets: TicketOption[] = [
  {
    id: 'price_1S6ZDpGxQziVA7Fsig68Zp3n', // Production price ID
    testPriceId: 'price_1S6ZD2GxQziVA7Fs0jwDbQQ9', // Test price ID
    title: 'React Crash Course - Early Bird',
    description: 'Access to Real-World React: The Architectural Crash Course for Scalability, Resilience, and Observability (feat. Next.js) (Early Bird Price)',
    price: 195,
    ticketType: 'workshop',
    workshopId: 'react-architecture',
    availableUntil: '2025-11-01T23:59:59', // Early bird ends November 1st, 2025
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
  },
  {
    id: 'price_1S6ZDpGxQziVA7FsJ1BAEHfQ', // Production price ID
    testPriceId: 'price_1S6ZDEGxQziVA7Fs4AuGXGz0', // Test price ID
    title: 'React Crash Course - Regular',
    description: 'Access to Real-World React: The Architectural Crash Course for Scalability, Resilience, and Observability (feat. Next.js) (Regular Price)',
    price: 250,
    ticketType: 'workshop',
    workshopId: 'react-architecture',
    availableFrom: '2025-11-01T23:59:59', // Available from November 1st, 2025 (when early bird ends)
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