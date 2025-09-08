import { TicketOption } from './TicketSelection';

export const observabilityWorkshopTickets: TicketOption[] = [
  {
    id: 'price_1S52uuGxQziVA7FsnHO0OVWz', // Production price ID
    testPriceId: 'price_1S52tJGxQziVA7FsTG1PWGs6', // Test price ID
    title: 'Observability Workshop - Early Bird',
    description: 'Access to the Observability in Action: Hands-On with Dynatrace Workshop (Early Bird Price)',
    price: 95,
    ticketType: 'workshop',
    workshopId: 'observability-dynatrace',
    availableUntil: '2025-10-01T23:59:59', // Early bird ends October 1st, 2025
    features: [
      '2 hour intensive hands-on workshop',
      'Learn the three pillars of observability',
      'Master Dynatrace AI-powered alerting',
      'Cost-effective data ingestion strategies',
      'Distributed tracing debugging techniques',
      'Hands-on with AstroShop demo application',
      'Workshop materials and resources',
      'Refreshments provided',
      'Networking opportunities with peers'
    ]
  },
  {
    id: 'price_1S52uuGxQziVA7FsIhgPAUAi', // Production price ID
    testPriceId: 'price_1S52thGxQziVA7FsKvqoVMUQ', // Test price ID
    title: 'Observability Workshop - Regular',
    description: 'Access to the Observability in Action: Hands-On with Dynatrace Workshop (Regular Price)',
    price: 125,
    ticketType: 'workshop',
    workshopId: 'observability-dynatrace',
    availableFrom: '2025-10-01T23:59:59', // Available from October 1st, 2025 (when early bird ends)
    features: [
      '2 hour intensive hands-on workshop',
      'Learn the three pillars of observability',
      'Master Dynatrace AI-powered alerting',
      'Cost-effective data ingestion strategies',
      'Distributed tracing debugging techniques',
      'Hands-on with AstroShop demo application',
      'Workshop materials and resources',
      'Refreshments provided',
      'Networking opportunities with peers'
    ]
  }
];