import { TicketOption } from './TicketSelection';

export const observabilityWorkshopTickets: TicketOption[] = [
  {
    id: 'price_observability_early_bird', // Production price ID - will need to be updated with actual Stripe price ID
    testPriceId: 'price_test_observability_early_bird', // Test price ID - will need to be updated with actual Stripe price ID
    title: 'Observability Workshop - Early Bird',
    description: 'Access to the Observability in Action: Hands-On with Dynatrace Workshop (Early Bird Price)',
    price: 95,
    ticketType: 'workshop',
    workshopId: 'observability-dynatrace',
    availableUntil: '2025-10-21T23:59:59', // One week before the workshop (Oct 28)
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
    id: 'price_observability_regular', // Production price ID - will need to be updated with actual Stripe price ID
    testPriceId: 'price_test_observability_regular', // Test price ID - will need to be updated with actual Stripe price ID
    title: 'Observability Workshop - Regular',
    description: 'Access to the Observability in Action: Hands-On with Dynatrace Workshop (Regular Price)',
    price: 125,
    ticketType: 'workshop',
    workshopId: 'observability-dynatrace',
    availableFrom: '2025-10-21T23:59:59', // Available from one week before
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