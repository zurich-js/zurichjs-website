import { TicketOption } from './TicketSelection';

export const observabilityWorkshopTickets: TicketOption[] = [
  {
    id: 'price_1S52uuGxQziVA7FsIhgPAUAi', // Production price ID
    testPriceId: 'price_1S52thGxQziVA7FsKvqoVMUQ', // Test price ID
    title: 'Observability Workshop',
    description: 'Access to the Observability in Action: Hands-On with Dynatrace Workshop',
    price: 125,
    ticketType: 'workshop',
    workshopId: 'observability-dynatrace',
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